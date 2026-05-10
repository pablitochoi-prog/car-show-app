import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { resolveLocationMapsDisabledReason } from "@/lib/resolve-event-location";
import {
  mailingAddressesMatch,
  standardizeMailingAddress,
  type MailingFields,
} from "@/lib/standardize-mailing-address";

const bodySchema = z.object({
  street: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const input: MailingFields = {
    street: parsed.data.street.trim(),
    city: (parsed.data.city ?? "").trim(),
    state: (parsed.data.state ?? "").trim(),
    zip: (parsed.data.zip ?? "").trim(),
  };

  if (!input.street) {
    return NextResponse.json({
      status: "no_street",
    } satisfies VerifyAddressResponse);
  }

  const disabled = resolveLocationMapsDisabledReason();
  if (disabled) {
    return NextResponse.json({
      status: "unavailable",
      message: disabled,
    } satisfies VerifyAddressResponse);
  }

  const result = await standardizeMailingAddress(input);
  if (!result.ok) {
    if (result.reason === "no_key") {
      return NextResponse.json({
        status: "unavailable",
        message: "Maps API key is not configured.",
      } satisfies VerifyAddressResponse);
    }
    return NextResponse.json({
      status: "not_found",
    } satisfies VerifyAddressResponse);
  }

  const { suggested, formattedAddress } = result;
  if (mailingAddressesMatch(input, suggested)) {
    return NextResponse.json({
      status: "match",
      address: suggested,
      formattedAddress,
    } satisfies VerifyAddressResponse);
  }

  return NextResponse.json({
    status: "suggestion",
    input,
    suggested,
    formattedAddress,
  } satisfies VerifyAddressResponse);
}

export type VerifyAddressResponse =
  | { status: "no_street" }
  | { status: "unavailable"; message: string }
  | { status: "not_found" }
  | { status: "match"; address: MailingFields; formattedAddress: string }
  | {
      status: "suggestion";
      input: MailingFields;
      suggested: MailingFields;
      formattedAddress: string;
    };
