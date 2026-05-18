import { maskContactIfBanned } from "@/lib/mask-banned-user-contact";
import { hasCompleteMailingAddress } from "@/lib/registration-address";

/** Contact info collected during event registration. */
export type RegistrationContact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
};

export function emptyRegistrationContact(): RegistrationContact {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
  };
}

export function isRegistrationContactComplete(c: RegistrationContact): boolean {
  return (
    c.firstName.trim().length > 0 &&
    c.lastName.trim().length > 0 &&
    c.email.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim()) &&
    hasCompleteMailingAddress(c)
  );
}

type RegistrationContactRow = {
  user: {
    firstName: string | null;
    lastName: string | null;
    name: string;
    email: string;
    phone: string | null;
    status?: string | null;
  } | null;
  guestFirstName: string | null;
  guestLastName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  registrantFirstName: string | null;
  registrantLastName: string | null;
  registrantEmail: string | null;
  registrantPhone: string | null;
};

/** Resolve name, email, and phone shown to organizers for a registration. */
export function resolveRegistrationContact(row: RegistrationContactRow) {
  const banned = row.user?.status === "BANNED";
  let result: { name: string; email: string; phone: string };

  if (
    row.registrantFirstName?.trim() ||
    row.registrantLastName?.trim() ||
    row.registrantEmail?.trim()
  ) {
    result = {
      name:
        [row.registrantFirstName, row.registrantLastName]
          .filter(Boolean)
          .join(" ")
          .trim() || "Registrant",
      email: row.registrantEmail?.trim() ?? "",
      phone: row.registrantPhone?.trim() ?? "",
    };
  } else if (!row.user) {
    result = {
      name:
        [row.guestFirstName, row.guestLastName].filter(Boolean).join(" ").trim() ||
        "Guest",
      email: row.guestEmail?.trim() ?? "",
      phone: row.guestPhone?.trim() ?? "",
    };
  } else {
    result = {
      name:
        [row.user.firstName, row.user.lastName].filter(Boolean).join(" ").trim() ||
        row.user.name,
      email: row.user.email,
      phone: row.user.phone?.trim() ?? "",
    };
  }

  if (banned) {
    return {
      ...result,
      email: maskContactIfBanned("BANNED", result.email),
      phone: result.phone
        ? maskContactIfBanned("BANNED", result.phone)
        : "",
    };
  }

  return result;
}
