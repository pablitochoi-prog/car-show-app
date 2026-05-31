import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  isBackgroundSessionRequest,
  shouldTouchSessionActivity,
} from "@/lib/session-activity-policy";

function mockRequest(
  pathname: string,
  method = "GET",
  headers: Record<string, string> = {},
) {
  return new NextRequest(`http://localhost:3000${pathname}`, {
    method,
    headers,
  });
}

describe("shouldTouchSessionActivity", () => {
  it("ignores unread message polling", () => {
    expect(
      shouldTouchSessionActivity(mockRequest("/api/messages/unread-count")),
    ).toBe(false);
  });

  it("ignores session-guards internal fetch", () => {
    expect(
      shouldTouchSessionActivity(mockRequest("/api/auth/session-guards")),
    ).toBe(false);
  });

  it("touches page navigation", () => {
    expect(shouldTouchSessionActivity(mockRequest("/dashboard"))).toBe(true);
  });

  it("touches explicit heartbeat POST", () => {
    expect(
      shouldTouchSessionActivity(
        mockRequest("/api/auth/session-activity", "POST"),
      ),
    ).toBe(true);
  });

  it("does not touch session-activity status GET", () => {
    expect(
      shouldTouchSessionActivity(
        mockRequest("/api/auth/session-activity", "GET"),
      ),
    ).toBe(false);
  });

  it("touches user mutation APIs", () => {
    expect(
      shouldTouchSessionActivity(mockRequest("/api/events/abc", "PATCH")),
    ).toBe(true);
  });

  it("ignores link prefetch requests", () => {
    expect(
      shouldTouchSessionActivity(
        mockRequest("/dashboard", "GET", { "Next-Router-Prefetch": "1" }),
      ),
    ).toBe(false);
  });

  it("marks background paths", () => {
    expect(isBackgroundSessionRequest("/api/messages/unread-count")).toBe(true);
  });
});
