import type { PrismaClient } from "@prisma/client";
import {
  PROMO_CODE_GENERATE_CHARS,
  PROMO_CODE_LENGTH,
} from "./promo-code-charset";

const DEFAULT_MAX_ATTEMPTS = 10;

function randomGeneratedCode(): string {
  const chars = PROMO_CODE_GENERATE_CHARS;
  let code = "";
  for (let i = 0; i < PROMO_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]!;
  }
  return code;
}

/** Format for admin display only — storage has no hyphens. */
export function formatPromoCodeForDisplay(code: string): string {
  if (code.length !== PROMO_CODE_LENGTH) return code;
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`;
}

export async function generateUniquePromoCode(
  prisma: PrismaClient,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
): Promise<string> {
  const [code] = await generateUniquePromoCodes(prisma, 1, maxAttempts);
  return code;
}

/** Generate `count` unique codes not present in the database. */
export async function generateUniquePromoCodes(
  prisma: PrismaClient,
  count: number,
  maxAttemptsPerCode = DEFAULT_MAX_ATTEMPTS,
): Promise<string[]> {
  if (count < 1) {
    throw new Error("Count must be at least 1.");
  }

  const codes = new Set<string>();
  const maxTotalAttempts = count * maxAttemptsPerCode;
  let attempts = 0;

  while (codes.size < count && attempts < maxTotalAttempts) {
    const candidate = randomGeneratedCode();
    attempts++;
    if (codes.has(candidate)) continue;

    const existing = await prisma.platformFeePromoCode.findUnique({
      where: { code: candidate },
      select: { id: true },
    });
    if (!existing) codes.add(candidate);
  }

  if (codes.size < count) {
    throw new Error("Could not generate a unique promo code. Please try again.");
  }

  return [...codes];
}
