import { prisma } from "@/lib/db";
import {
  DEFAULT_PLATFORM_FEE,
  type PlatformFeeConfig,
} from "@/lib/platform-fee-config";

export type { PlatformFeeConfig } from "@/lib/platform-fee-config";
export {
  calculateApplicationFee,
  formatFeeLabel,
  DEFAULT_PLATFORM_FEE,
} from "@/lib/platform-fee-config";

/**
 * Read the global platform convenience fee from GlobalSetting.
 * Returns the default ($0.50 fixed) if not yet configured.
 */
export async function getPlatformFee(): Promise<PlatformFeeConfig> {
  const row = await prisma.globalSetting.findUnique({
    where: { key: "platform_fee" },
  });

  if (!row) return DEFAULT_PLATFORM_FEE;

  const val = row.value as Record<string, unknown>;
  const type = val.type as PlatformFeeConfig["type"] | undefined;

  if (!type || !["NONE", "FIXED", "PERCENT"].includes(type)) {
    return DEFAULT_PLATFORM_FEE;
  }

  return {
    type,
    amountCents: typeof val.amountCents === "number" ? val.amountCents : null,
    percent: typeof val.percent === "number" ? val.percent : null,
  };
}
