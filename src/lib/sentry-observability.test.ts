import { afterEach, describe, expect, it, vi } from "vitest";

const captureExceptionMock = vi.hoisted(() => vi.fn());
const withScopeMock = vi.hoisted(() =>
  vi.fn((cb: (scope: { setExtra: (k: string, v: unknown) => void }) => void) => {
    cb({ setExtra: vi.fn() });
  }),
);

vi.mock("@sentry/nextjs", () => ({
  captureException: captureExceptionMock,
  withScope: withScopeMock,
}));

import {
  captureObservabilityException,
  isSentryEnabled,
  parseSentrySampleRate,
} from "./sentry-observability";

describe("isSentryEnabled", () => {
  const originalDsn = process.env.SENTRY_DSN;
  const originalEnabled = process.env.SENTRY_ENABLED;

  afterEach(() => {
    if (originalDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = originalDsn;
    if (originalEnabled === undefined) delete process.env.SENTRY_ENABLED;
    else process.env.SENTRY_ENABLED = originalEnabled;
  });

  it("is disabled without SENTRY_DSN", () => {
    delete process.env.SENTRY_DSN;
    delete process.env.SENTRY_ENABLED;
    expect(isSentryEnabled()).toBe(false);
  });

  it("is enabled when DSN is set", () => {
    process.env.SENTRY_DSN = "https://example@sentry.io/1";
    delete process.env.SENTRY_ENABLED;
    expect(isSentryEnabled()).toBe(true);
  });

  it("can be disabled via SENTRY_ENABLED=false", () => {
    process.env.SENTRY_DSN = "https://example@sentry.io/1";
    process.env.SENTRY_ENABLED = "false";
    expect(isSentryEnabled()).toBe(false);
  });
});

describe("parseSentrySampleRate", () => {
  const original = process.env.SENTRY_TRACES_SAMPLE_RATE;

  afterEach(() => {
    if (original === undefined) delete process.env.SENTRY_TRACES_SAMPLE_RATE;
    else process.env.SENTRY_TRACES_SAMPLE_RATE = original;
  });

  it("defaults to fallback for invalid values", () => {
    process.env.SENTRY_TRACES_SAMPLE_RATE = "not-a-number";
    expect(parseSentrySampleRate("SENTRY_TRACES_SAMPLE_RATE", 0.05)).toBe(0.05);
  });

  it("parses valid sample rates", () => {
    process.env.SENTRY_TRACES_SAMPLE_RATE = "0.1";
    expect(parseSentrySampleRate("SENTRY_TRACES_SAMPLE_RATE", 0.05)).toBe(0.1);
  });
});

describe("captureObservabilityException", () => {
  afterEach(() => {
    captureExceptionMock.mockReset();
    withScopeMock.mockClear();
  });

  it("does not call Sentry when DSN is missing", () => {
    delete process.env.SENTRY_DSN;
    delete process.env.SENTRY_ENABLED;
    captureObservabilityException(new Error("test"), { source: "unit_test" });
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it("captures when Sentry is enabled", () => {
    process.env.SENTRY_DSN = "https://example@sentry.io/1";
    delete process.env.SENTRY_ENABLED;
    captureObservabilityException(new Error("test"), { source: "unit_test" });
    expect(withScopeMock).toHaveBeenCalled();
    expect(captureExceptionMock).toHaveBeenCalled();
  });
});
