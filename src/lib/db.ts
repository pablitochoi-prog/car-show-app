import { Prisma, PrismaClient } from "@prisma/client";

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
 * Supabase pooler (pgbouncer): Prisma must use a bounded pool per client instance.
 * In local dev, connection_limit=1 causes P2024 when middleware session-guards,
 * layout unread counts, and page queries run concurrently on the same singleton.
 */
function prismaDatasourceUrl(): string {
  let url = process.env.DATABASE_URL!;
  const isDev = process.env.NODE_ENV !== "production";

  // Dev safety net: Supabase copy-paste often includes connection_limit=1.
  if (isDev && /connection_limit=1(?=&|$)/i.test(url)) {
    url = url.replace(/connection_limit=1/i, "connection_limit=5");
  }

  if (!/[?&]pool_timeout=/i.test(url)) {
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}pool_timeout=30`;
  }

  if (!/[?&]connection_limit=/i.test(url)) {
    const sep = url.includes("?") ? "&" : "?";
    const limit = /pgbouncer=true/i.test(url) ? (isDev ? 5 : 1) : 5;
    url = `${url}${sep}connection_limit=${limit}`;
  }

  return url;
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

const globalForPrismaDirect = globalThis as unknown as {
  prismaDirect: PrismaClient | undefined;
};

/** Session/direct connection for interactive transactions (PgBouncer transaction pooler cannot hold BEGIN…COMMIT). */
function directPrismaDatasourceUrl(): string {
  const url = process.env.DIRECT_URL!;
  if (/[?&]connection_limit=/i.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=5`;
}

function createPrismaDirectClient(): PrismaClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "Database access is server-only. Import Prisma from API routes or Server Components, not client components.",
    );
  }
  assertPostgresUrls();
  return new PrismaClient({
    datasources: {
      db: { url: directPrismaDatasourceUrl() },
    },
  });
}

const existingDirect = globalForPrismaDirect.prismaDirect;
export const prismaDirect = existingDirect ?? createPrismaDirectClient();

if (!existingDirect) {
  globalForPrismaDirect.prismaDirect = prismaDirect;
}

export const INTERACTIVE_TX_DEFAULTS = {
  maxWait: 10_000,
  timeout: 30_000,
} as const;

/** Run an interactive transaction on the direct/session DB connection. */
export async function runInteractiveTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { maxWait?: number; timeout?: number },
): Promise<T> {
  return prismaDirect.$transaction(fn, {
    maxWait: options?.maxWait ?? INTERACTIVE_TX_DEFAULTS.maxWait,
    timeout: options?.timeout ?? INTERACTIVE_TX_DEFAULTS.timeout,
  });
}
