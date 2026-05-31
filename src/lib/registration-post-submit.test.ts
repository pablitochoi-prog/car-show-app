import { afterEach, describe, expect, it, vi } from "vitest";

const afterMock = vi.hoisted(() => vi.fn());
const syncPhotosMock = vi.hoisted(() => vi.fn());
const notifyEmailMock = vi.hoisted(() => vi.fn());
const syncIndexMock = vi.hoisted(() => vi.fn());
const runInteractiveTransactionMock = vi.hoisted(() =>
  vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
);

vi.mock("next/server", () => ({
  after: afterMock,
}));

vi.mock("@/lib/db", () => ({
  runInteractiveTransaction: runInteractiveTransactionMock,
}));

vi.mock("@/lib/event-registration-staff-photos", () => ({
  syncAllRegistrationStaffPhotos: syncPhotosMock,
}));

vi.mock("@/lib/email/notify-registration-confirmation-email", () => ({
  notifyRegistrationConfirmationEmail: notifyEmailMock,
}));

vi.mock("@/lib/vehicle-entry-index", () => ({
  syncVehicleEntryIndexForRegistration: syncIndexMock,
}));

vi.mock("@/lib/sentry-observability", () => ({
  captureObservabilityException: vi.fn(),
}));

import {
  isRegistrationPostSubmitBackgroundEnabled,
  runRegistrationPostSubmitSideEffects,
  scheduleRegistrationPostSubmitSideEffects,
} from "./registration-post-submit";

const ctx = {
  route: "api.events.register-guest",
  eventId: "evt-1",
  registrationId: "reg-1",
};

describe("isRegistrationPostSubmitBackgroundEnabled", () => {
  const original = process.env.REGISTRATION_POST_SUBMIT_BACKGROUND;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.REGISTRATION_POST_SUBMIT_BACKGROUND;
    } else {
      process.env.REGISTRATION_POST_SUBMIT_BACKGROUND = original;
    }
  });

  it("defaults to enabled", () => {
    delete process.env.REGISTRATION_POST_SUBMIT_BACKGROUND;
    expect(isRegistrationPostSubmitBackgroundEnabled()).toBe(true);
  });

  it("disables when env is false", () => {
    process.env.REGISTRATION_POST_SUBMIT_BACKGROUND = "false";
    expect(isRegistrationPostSubmitBackgroundEnabled()).toBe(false);
  });
});

describe("runRegistrationPostSubmitSideEffects", () => {
  afterEach(() => {
    syncPhotosMock.mockReset();
    notifyEmailMock.mockReset();
    syncIndexMock.mockReset();
    runInteractiveTransactionMock.mockReset();
    runInteractiveTransactionMock.mockImplementation(async (fn) => fn({}));
  });

  it("runs staff photo sync, confirmation email, and vehicle entry index sync", async () => {
    syncPhotosMock.mockResolvedValue(undefined);
    notifyEmailMock.mockResolvedValue(undefined);
    syncIndexMock.mockResolvedValue({
      created: 1,
      updated: 0,
      removed: 0,
      skipped: 0,
      conflicts: [],
    });

    const results = await runRegistrationPostSubmitSideEffects(ctx);

    expect(syncPhotosMock).toHaveBeenCalledWith("reg-1");
    expect(notifyEmailMock).toHaveBeenCalledWith("reg-1");
    expect(runInteractiveTransactionMock).toHaveBeenCalledTimes(1);
    expect(syncIndexMock).toHaveBeenCalledWith({}, "reg-1");
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it("still completes when a side effect fails", async () => {
    syncPhotosMock.mockRejectedValue(new Error("R2 unavailable"));
    notifyEmailMock.mockResolvedValue(undefined);
    syncIndexMock.mockResolvedValue({
      created: 0,
      updated: 0,
      removed: 0,
      skipped: 0,
      conflicts: [],
    });

    const results = await runRegistrationPostSubmitSideEffects(ctx);

    expect(results).toHaveLength(3);
    const photoResult = results.find((r) => r.sideEffect === "staff_photo_sync");
    const emailResult = results.find((r) => r.sideEffect === "confirmation_email");
    expect(photoResult?.success).toBe(false);
    expect(emailResult?.success).toBe(true);
  });

  it("still completes when all side effects fail", async () => {
    syncPhotosMock.mockRejectedValue(new Error("R2 unavailable"));
    notifyEmailMock.mockRejectedValue(new Error("SendGrid down"));
    runInteractiveTransactionMock.mockRejectedValue(new Error("DB busy"));

    const results = await runRegistrationPostSubmitSideEffects(ctx);

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.success === false)).toBe(true);
  });
});

describe("scheduleRegistrationPostSubmitSideEffects", () => {
  afterEach(() => {
    afterMock.mockReset();
  });

  it("schedules work with after()", () => {
    scheduleRegistrationPostSubmitSideEffects(ctx);

    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(typeof afterMock.mock.calls[0]?.[0]).toBe("function");
  });

  it("runs side effects only when the after callback executes", async () => {
    syncPhotosMock.mockResolvedValue(undefined);
    notifyEmailMock.mockResolvedValue(undefined);
    syncIndexMock.mockResolvedValue({
      created: 0,
      updated: 0,
      removed: 0,
      skipped: 0,
      conflicts: [],
    });

    scheduleRegistrationPostSubmitSideEffects(ctx);

    const scheduled = afterMock.mock.calls[0]?.[0] as () => Promise<unknown>;
    await scheduled();

    expect(syncPhotosMock).toHaveBeenCalledWith("reg-1");
    expect(notifyEmailMock).toHaveBeenCalledWith("reg-1");
    expect(syncIndexMock).toHaveBeenCalledWith({}, "reg-1");
  });
});
