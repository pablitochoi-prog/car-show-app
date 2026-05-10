import { PrismaClient } from "@prisma/client";

/** Trim and strip accidental wrapping quotes from .env copy-paste. */
function normalizePostgresEnv(key: "DATABASE_URL" | "DIRECT_URL"): void {
  const v = process.env[key];
  if (v == null || v === "") return;
  const t = v.trim().replace(/^["']|["']$/g, "");
  if (t !== v) process.env[key] = t;
}

function assertPostgresUrls(): void {
  normalizePostgresEnv("DATABASE_URL");
  normalizePostgresEnv("DIRECT_URL");

  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl) {
    throw new Error(
      "DATABASE_URL is missing or empty in .env.local. Add a Postgres URL from Supabase → Project Settings → Database (Transaction pooler for DATABASE_URL, port 6543 with ?pgbouncer=true). Restart `npm run dev` after saving."
    );
  }
  if (!dbUrl.startsWith("postgres://") && !dbUrl.startsWith("postgresql://")) {
    throw new Error(
      "DATABASE_URL must start with postgresql:// or postgres://. Fix car-show-app/.env.local (remove spaces before the URL, wrong variable name, or a non-Postgres URL). See .env.example."
    );
  }

  const direct = process.env.DIRECT_URL ?? "";
  if (!direct) {
    throw new Error(
      "DIRECT_URL is missing or empty in .env.local. Use the direct (session) connection string from Supabase Database settings (port 5432, no pgbouncer). Restart `npm run dev` after saving."
    );
  }
  if (!direct.startsWith("postgres://") && !direct.startsWith("postgresql://")) {
    throw new Error(
      "DIRECT_URL must start with postgresql:// or postgres://. Fix car-show-app/.env.local. See .env.example."
    );
  }
}

assertPostgresUrls();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Production: singleton to avoid exhausting DB connections on serverless/lambda.
 * Development: no global cache — after `prisma generate` / migrations, a new client
 * picks up schema changes without a stuck Turbopack bundle referencing an old client.
 */
export const prisma =
  process.env.NODE_ENV === "production"
    ? (globalForPrisma.prisma ?? new PrismaClient())
    : new PrismaClient();

if (process.env.NODE_ENV === "production") {
  globalForPrisma.prisma = prisma;
}
