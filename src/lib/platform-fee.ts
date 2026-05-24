import { prisma } from "@/lib/db";
import {
  DEFAULT_PLATFORM_FEE,
  DEFAULT_EVENT_SETUP_FEE,
  type PlatformFeeConfig,
  type EventSetupFeeConfig,
} from "@/lib/platform-fee-config";

export type { PlatformFeeConfig, EventSetupFeeConfig } from "@/lib/platform-fee-config";
export {
  calculateApplicationFee,
  formatFeeLabel,
  DEFAULT_PLATFORM_FEE,
  DEFAULT_EVENT_SETUP_FEE,
} from "@/lib/platform-fee-config";
export {
  formatEventSetupFeeLabel,
  effectivePlatformFeeConfig,
  perVehiclePlatformFeeCents,
  flatEventSetupFeeCents,
  totalPlatformFeeForCheckout,
  type EventPlatformFeeMode,
} from "@/lib/event-platform-fee";

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

/**
 * Read the global flat event setup fee from GlobalSetting.
 * Default is $75.00 per event.
 */
export async function getEventSetupFee(): Promise<EventSetupFeeConfig> {
  const row = await prisma.globalSetting.findUnique({
    where: { key: "event_setup_fee" },
  });

  if (!row) return DEFAULT_EVENT_SETUP_FEE;

  const val = row.value as Record<string, unknown>;
  const amountCents =
    typeof val.amountCents === "number" ? val.amountCents : DEFAULT_EVENT_SETUP_FEE.amountCents;

  return { amountCents: Math.max(0, amountCents) };
}
