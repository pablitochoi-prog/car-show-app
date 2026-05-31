import { describe, expect, it } from "vitest";
import { shouldRunSessionGuardsInMiddleware } from "./session-guards-middleware";

describe("shouldRunSessionGuardsInMiddleware", () => {
  it("skips background polls", () => {
    expect(shouldRunSessionGuardsInMiddleware("/api/messages/unread-count")).toBe(
      false,
    );
    expect(
      shouldRunSessionGuardsInMiddleware("/api/auth/session-guards"),
    ).toBe(false);
  });

  it("runs for dashboard and organizer pages", () => {
    expect(shouldRunSessionGuardsInMiddleware("/dashboard/events")).toBe(true);
    expect(
      shouldRunSessionGuardsInMiddleware("/organizer/events/x/edit"),
    ).toBe(true);
  });

  it("skips ordinary event API loaders", () => {
    expect(
      shouldRunSessionGuardsInMiddleware(
        "/api/events/abc/categories",
      ),
    ).toBe(false);
    expect(
      shouldRunSessionGuardsInMiddleware("/api/events/abc/charity"),
    ).toBe(false);
  });

  it("runs for admin APIs", () => {
    expect(shouldRunSessionGuardsInMiddleware("/api/admin/events")).toBe(true);
  });
});
