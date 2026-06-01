import { describe, expect, it, vi } from "vitest";
import { getMfaSessionState } from "@/lib/mfa-session";

function mockSupabase(input: {
  user?: {
    factors?: {
      id: string;
      factor_type: string;
      status: string;
    }[];
  } | null;
  accessToken?: string | null;
  getUserError?: Error;
}) {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: input.user ?? null },
        error: input.getUserError ?? null,
      })),
      getSession: vi.fn(async () => ({
        data: {
          session: input.accessToken
            ? { access_token: input.accessToken }
            : null,
        },
        error: null,
      })),
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn(),
        listFactors: vi.fn(),
      },
    },
  };
}

describe("getMfaSessionState", () => {
  it("uses getUser() and does not call getAuthenticatorAssuranceLevel", async () => {
    const payload = Buffer.from(
      JSON.stringify({ aal: "aal1", session_id: "sess-1" }),
    ).toString("base64url");
    const token = `hdr.${payload}.sig`;

    const supabase = mockSupabase({
      user: {
        factors: [
          { id: "f1", factor_type: "totp", status: "verified" },
        ],
      },
      accessToken: token,
    });

    const state = await getMfaSessionState(supabase as never);

    expect(state.hasVerifiedTotp).toBe(true);
    expect(state.needsMfaVerification).toBe(true);
    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(supabase.auth.mfa.getAuthenticatorAssuranceLevel).not.toHaveBeenCalled();
  });
});
