/** Serializable user row for admin accounts UI and API responses. */
export type AdminAccountRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  platformRole: string;
  status: string;
  statusReason: string | null;
  statusChangedAt?: string | null;
  archivedAt: string | null;
  createdAt: string;
};

type UserRowInput = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  platformRole: string;
  status: string;
  statusReason: string | null;
  statusChangedAt?: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
};

export function serializeAdminAccountRow(u: UserRowInput): AdminAccountRow {
  return {
    id: u.id,
    firstName: u.firstName ?? "",
    lastName: u.lastName ?? "",
    email: u.email,
    phone: u.phone,
    city: u.city,
    state: u.state,
    platformRole: u.platformRole,
    status: u.status,
    statusReason: u.statusReason,
    statusChangedAt: u.statusChangedAt?.toISOString() ?? null,
    archivedAt: u.archivedAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

export const adminAccountListSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  city: true,
  state: true,
  platformRole: true,
  status: true,
  statusReason: true,
  statusChangedAt: true,
  archivedAt: true,
  createdAt: true,
} as const;
