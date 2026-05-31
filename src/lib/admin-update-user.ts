import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  adminAccountUpdateSchema,
  normalizeProfilePayload,
  type AdminAccountUpdateInput,
} from "@/lib/validation/admin-account";
import { updateProfileSchema } from "@/lib/validation/profile";

export type AdminUserUpdateResult =
  | { ok: true; user: Record<string, unknown> }
  | { ok: false; status: number; error: string };

export async function applyAdminUserUpdate(
  input: AdminAccountUpdateInput,
  actingAdmin: { id: string; platformRole: string },
): Promise<AdminUserUpdateResult> {
  const parsed = adminAccountUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return { ok: false, status: 400, error: msg };
  }

  const body = parsed.data;

  if (body.id === actingAdmin.id) {
    if (body.status && body.status !== "ACTIVE") {
      return {
        ok: false,
        status: 400,
        error: "You cannot suspend or ban your own account",
      };
    }
    if (
      body.platformRole &&
      body.platformRole !== "ADMIN" &&
      actingAdmin.platformRole === "ADMIN"
    ) {
      return {
        ok: false,
        status: 400,
        error: "You cannot remove your own admin role",
      };
    }
  }

  const existing = await prisma.user.findUnique({
    where: { id: body.id },
    select: {
      id: true,
      email: true,
      supabaseId: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!existing) {
    return { ok: false, status: 404, error: "User not found" };
  }

  const data: Prisma.UserUpdateInput = {};

  if (body.firstName !== undefined) {
    data.firstName = body.firstName.trim() || null;
  }
  if (body.lastName !== undefined) {
    data.lastName = body.lastName.trim() || null;
  }
  if (body.firstName !== undefined || body.lastName !== undefined) {
    const fn = (body.firstName ?? existing.firstName ?? "").trim();
    const ln = (body.lastName ?? existing.lastName ?? "").trim();
    data.name = [fn, ln].filter(Boolean).join(" ") || "Unnamed";
  }

  if (body.birthYear !== undefined) {
    data.birthYear = body.birthYear ?? null;
  }

  if (body.phone !== undefined) {
    const phoneResult = updateProfileSchema
      .pick({ firstName: true, lastName: true, phone: true })
      .safeParse({
        firstName: existing.firstName ?? "User",
        lastName: existing.lastName ?? "Account",
        phone: body.phone,
      });
    if (!phoneResult.success) {
      const msg = phoneResult.error.issues[0]?.message ?? "Invalid phone number";
      return { ok: false, status: 400, error: msg };
    }
    data.phone = normalizeProfilePayload(phoneResult.data).phone;
  }

  if (body.street !== undefined) data.street = body.street?.trim() || null;
  if (body.city !== undefined) data.city = body.city?.trim() || null;
  if (body.state !== undefined) data.state = body.state?.trim() || null;
  if (body.zip !== undefined) data.zip = body.zip?.trim() || null;

  if (body.platformRole) {
    data.platformRole = body.platformRole;
  }

  if (body.status) {
    data.status = body.status;
    data.statusChangedAt = new Date();
    if (body.statusReason !== undefined) {
      data.statusReason = body.statusReason?.trim() || null;
    }
  } else if (body.statusReason !== undefined) {
    data.statusReason = body.statusReason?.trim() || null;
  }

  if (body.archive === true) data.archivedAt = new Date();
  if (body.archive === false) data.archivedAt = null;

  if (body.email && body.email !== existing.email) {
    const taken = await prisma.user.findFirst({
      where: { email: body.email, NOT: { id: body.id } },
      select: { id: true },
    });
    if (taken) {
      return {
        ok: false,
        status: 400,
        error: "That email address is already in use by another account.",
      };
    }

    try {
      const supabase = createServiceRoleClient();
      const { error: supaErr } = await supabase.auth.admin.updateUserById(
        existing.supabaseId,
        { email: body.email, email_confirm: true },
      );
      if (supaErr) {
        console.error("admin account update: supabase email", supaErr.message);
        return {
          ok: false,
          status: 400,
          error:
            supaErr.message ||
            "Could not update login email in Supabase. Check that the address is valid.",
        };
      }
    } catch (e) {
      console.error("admin account update: supabase client", e);
      return {
        ok: false,
        status: 500,
        error: "Supabase is not configured. Cannot update login email.",
      };
    }

    data.email = body.email;
  }

  try {
    const updated = await prisma.user.update({
      where: { id: body.id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        street: true,
        city: true,
        state: true,
        zip: true,
        birthYear: true,
        platformRole: true,
        status: true,
        statusReason: true,
        statusChangedAt: true,
        archivedAt: true,
      },
    });

    return {
      ok: true,
      user: {
        ...updated,
        firstName: updated.firstName ?? "",
        lastName: updated.lastName ?? "",
        statusChangedAt: updated.statusChangedAt?.toISOString() ?? null,
        archivedAt: updated.archivedAt?.toISOString() ?? null,
      },
    };
  } catch (e) {
    console.error("admin account update: prisma", e);
    return { ok: false, status: 500, error: "Could not save account changes." };
  }
}
