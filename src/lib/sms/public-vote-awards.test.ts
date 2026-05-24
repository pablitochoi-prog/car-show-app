import { describe, expect, it } from "vitest";
import {
  isLockedPublicVoteAward,
  publicVoteAwardLabel,
} from "./public-vote-awards";

describe("public-vote-awards", () => {
  it("treats People's Choice and Kid's Choice as locked public vote", () => {
    expect(isLockedPublicVoteAward("People's Choice")).toBe(true);
    expect(isLockedPublicVoteAward("Kid's Choice")).toBe(true);
    expect(isLockedPublicVoteAward("Best in Show")).toBe(false);
  });

  it("labels locked awards as Public vote even if flag is false", () => {
    expect(publicVoteAwardLabel("People's Choice", false)).toBe("Public vote");
    expect(publicVoteAwardLabel("Kid's Choice", false)).toBe("Public vote");
  });

  it("labels optional sms-eligible awards as Public vote", () => {
    expect(publicVoteAwardLabel("Best Paint", true)).toBe("Public vote");
    expect(publicVoteAwardLabel("Best Paint", false)).toBe("Judge graded");
  });
});
