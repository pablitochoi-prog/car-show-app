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

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Supabase pooler (pgbouncer): Prisma must use a single connection per client instance.
 * Without this, each PrismaClient opens a large default pool and quickly hits EMAXCONN.
 */
function prismaDatasourceUrl(): string {
  const url = process.env.DATABASE_URL!;
  if (/[?&]connection_limit=/i.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  const limit = /pgbouncer=true/i.test(url) ? 1 : 5;
  return `${url}${sep}connection_limit=${limit}`;
}

function createPrismaClient(): PrismaClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "Database access is server-only. Import Prisma from API routes or Server Components, not client components.",
    );
  }
  assertPostgresUrls();
  return new PrismaClient({
    datasources: {
      db: { url: prismaDatasourceUrl() },
    },
  });
}

/**
 * One Prisma client per Node process. Dev hot reload must not create new clients
 * (each orphan pool holds connections until Supabase returns max client errors).
 */
const existing = globalForPrisma.prisma;
export const prisma = existing ?? createPrismaClient();

if (!existing) {
  globalForPrisma.prisma = prisma;
}
