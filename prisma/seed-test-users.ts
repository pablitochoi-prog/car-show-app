/**
 * Seed script: creates test users in Supabase Auth + Prisma with different platform roles.
 *
 * Usage:  npx tsx --env-file=.env.local prisma/seed-test-users.ts
 *
 * Idempotent — skips users that already exist in Supabase, upserts Prisma rows.
 */

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// Node 20 lacks native WebSocket; provide ws from the transitive dep
let WebSocketImpl: unknown;
try {
  WebSocketImpl = require("ws");
} catch { /* Node 22+ has native WebSocket */ }

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: WebSocketImpl ? { transport: WebSocketImpl as never } : undefined,
});

const prisma = new PrismaClient();

const TEST_PASSWORD = "TestPass123!";

const TEST_USERS = [
  {
    email: "pablitochoi@yahoo.com",
    firstName: "Pablo",
    lastName: "Choi",
    platformRole: "ADMIN" as const,
  },
  {
    email: "pablitochoi@gmail.com",
    firstName: "Pablo",
    lastName: "Organizer",
    platformRole: "ORGANIZER" as const,
  },
  {
    email: "pablitochoi@icloud.com",
    firstName: "Pablo",
    lastName: "Registrant",
    platformRole: "USER" as const,
  },
];

async function ensureSupabaseUser(email: string, firstName: string, lastName: string) {
  // Check if user already exists by listing with email filter
  const { data: existingList } = await supabase.auth.admin.listUsers();
  const existing = existingList?.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );

  if (existing) {
    console.log(`  Supabase: ${email} already exists (id: ${existing.id})`);
    // Ensure password is set to the test password
    const { error: pwErr } = await supabase.auth.admin.updateUserById(existing.id, {
      password: TEST_PASSWORD,
    });
    if (pwErr) console.warn(`  Supabase: could not reset password — ${pwErr.message}`);
    else console.log(`  Supabase: password reset to ${TEST_PASSWORD}`);
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      name: `${firstName} ${lastName}`,
    },
  });

  if (error) {
    // Handle "already registered" gracefully
    if (error.message?.includes("already been registered")) {
      const { data: list2 } = await supabase.auth.admin.listUsers();
      const found = list2?.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      );
      if (found) {
        console.log(`  Supabase: ${email} already registered (id: ${found.id})`);
        return found.id;
      }
    }
    throw new Error(`Failed to create Supabase user ${email}: ${error.message}`);
  }

  console.log(`  Supabase: created ${email} (id: ${data.user.id})`);
  return data.user.id;
}

async function upsertPrismaUser(
  supabaseId: string,
  email: string,
  firstName: string,
  lastName: string,
  platformRole: "USER" | "ORGANIZER" | "ADMIN",
) {
  const name = `${firstName} ${lastName}`;

  const user = await prisma.user.upsert({
    where: { supabaseId },
    update: { email, name, firstName, lastName, platformRole },
    create: {
      supabaseId,
      email,
      name,
      firstName,
      lastName,
      platformRole,
    },
  });

  console.log(`  Prisma:   ${email} → platformRole=${user.platformRole} (id: ${user.id})`);
  return user;
}

async function main() {
  console.log("\n=== Seeding test users ===\n");

  for (const tu of TEST_USERS) {
    console.log(`\n[${tu.email}] role=${tu.platformRole}`);

    const supabaseId = await ensureSupabaseUser(tu.email, tu.firstName, tu.lastName);
    await upsertPrismaUser(supabaseId, tu.email, tu.firstName, tu.lastName, tu.platformRole);
  }

  console.log("\n=== Done ===");
  console.log(`\nAll test users can log in with password: ${TEST_PASSWORD}`);
  console.log("Guest/logged-out: just visit the app without logging in.\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
