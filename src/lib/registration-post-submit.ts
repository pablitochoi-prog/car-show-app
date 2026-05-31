import { after } from "next/server";
import { runInteractiveTransaction } from "@/lib/db";
import { syncAllRegistrationStaffPhotos } from "@/lib/event-registration-staff-photos";
import { notifyRegistrationConfirmationEmail } from "@/lib/email/notify-registration-confirmation-email";
import { syncVehicleEntryIndexForRegistration } from "@/lib/vehicle-entry-index";

export type RegistrationPostSubmitContext = {
  route: string;
  eventId: string;
  registrationId: string;
};

export type RegistrationPostSubmitSideEffect =
  | "staff_photo_sync"
  | "confirmation_email"
  | "vehicle_entry_index_sync";

type SideEffectRunResult = {
  sideEffect: RegistrationPostSubmitSideEffect;
  durationMs: number;
  success: boolean;
};

/** When false, routes await side effects synchronously (rollback / local debugging). */
export function isRegistrationPostSubmitBackgroundEnabled(): boolean {
  const raw = process.env.REGISTRATION_POST_SUBMIT_BACKGROUND?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") {
    return false;
  }
  return true;
}

async function runSideEffect(
  ctx: RegistrationPostSubmitContext,
  sideEffect: RegistrationPostSubmitSideEffect,
  fn: () => Promise<void>,
): Promise<SideEffectRunResult> {
  const startedAt = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - startedAt;
    console.info("[registration-post-submit] Side effect completed", {
      route: ctx.route,
      eventId: ctx.eventId,
      registrationId: ctx.registrationId,
      sideEffect,
      durationMs,
      success: true,
    });
    return { sideEffect, durationMs, success: true };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error("[registration-post-submit] Side effect failed", {
      route: ctx.route,
      eventId: ctx.eventId,
      registrationId: ctx.registrationId,
      sideEffect,
      durationMs,
      success: false,
      error,
    });
    return { sideEffect, durationMs, success: false };
  }
}

/**
 * Runs non-critical registration side effects after the DB transaction commits.
 * Never throws — failures are logged with safe metadata only.
 */
export async function runRegistrationPostSubmitSideEffects(
  ctx: RegistrationPostSubmitContext,
): Promise<SideEffectRunResult[]> {
  return Promise.all([
    runSideEffect(ctx, "staff_photo_sync", () =>
      syncAllRegistrationStaffPhotos(ctx.registrationId),
    ),
    runSideEffect(ctx, "confirmation_email", () =>
      notifyRegistrationConfirmationEmail(ctx.registrationId),
    ),
    runSideEffect(ctx, "vehicle_entry_index_sync", async () => {
      await runInteractiveTransaction((tx) =>
        syncVehicleEntryIndexForRegistration(tx, ctx.registrationId),
      );
    }),
  ]);
}

/**
 * Schedules post-submit side effects via Next.js after() so the HTTP response
 * can return before SendGrid / R2 work finishes.
 */
export function scheduleRegistrationPostSubmitSideEffects(
  ctx: RegistrationPostSubmitContext,
): void {
  after(() => runRegistrationPostSubmitSideEffects(ctx));
}
