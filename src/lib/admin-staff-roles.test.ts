import { describe, expect, it } from "vitest";
import {
  BUILTIN_DEFAULT_STAFF_ROLES,
  mergeWithBuiltinDefaultStaffRoles,
} from "@/lib/admin-staff-roles";

describe("mergeWithBuiltinDefaultStaffRoles", () => {
  it("adds Head Judge when stored template predates that role", () => {
    const legacy = BUILTIN_DEFAULT_STAFF_ROLES.filter((r) => r.slug !== "head_judge");
    const merged = mergeWithBuiltinDefaultStaffRoles(legacy);
    expect(merged.some((r) => r.slug === "head_judge" && r.name === "Head Judge")).toBe(
      true,
    );
    expect(merged.some((r) => r.slug === "judge" && r.name === "Judge")).toBe(true);
    expect(merged.length).toBe(BUILTIN_DEFAULT_STAFF_ROLES.length);
  });
});
