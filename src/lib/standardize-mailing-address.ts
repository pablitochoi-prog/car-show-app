import { parseGoogleAddressComponents } from "@/lib/google-address-components";
import { mapsApiKey } from "@/lib/maps-api-key";

export type MailingFields = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

function zipBase(z: string): string {
  return z.replace(/\D/g, "").slice(0, 5);
}

/** Normalize for equality checks (US mailing). */
export function normalizeMailingForCompare(a: MailingFields): MailingFields {
  return {
    street: a.street.trim().replace(/\s+/g, " ").toLowerCase(),
    city: a.city.trim().replace(/\s+/g, " ").toLowerCase(),
    state: a.state.trim().toUpperCase(),
    zip: zipBase(a.zip),
  };
}

export function mailingAddressesMatch(a: MailingFields, b: MailingFields): boolean {
  const na = normalizeMailingForCompare(a);
  const nb = normalizeMailingForCompare(b);
  return (
    na.street === nb.street &&
    na.city === nb.city &&
    na.state === nb.state &&
    na.zip === nb.zip
  );
}

export type StandardizeResult =
  | { ok: false; reason: "no_key" | "not_found" | "incomplete" }
  | {
      ok: true;
      suggested: MailingFields;
      formattedAddress: string;
    };

/**
 * Geocode a US mailing address via Google Geocoding API and parse components.
 */
export async function standardizeMailingAddress(
  input: MailingFields
): Promise<StandardizeResult> {
  const key = mapsApiKey();
  if (!key) return { ok: false, reason: "no_key" };

  const street = input.street.trim();
  if (!street) return { ok: false, reason: "incomplete" };

  const query = [street, input.city, input.state, input.zip]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean)
    .join(", ");

  const params = new URLSearchParams({
    address: query,
    components: "country:US",
    key,
  });
  const url = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  } catch {
    return { ok: false, reason: "not_found" };
  }
  if (!res.ok) return { ok: false, reason: "not_found" };

  const data = (await res.json()) as {
    status: string;
    results?: {
      formatted_address?: string;
      address_components: {
        long_name: string;
        short_name: string;
        types: string[];
      }[];
    }[];
  };

  if (data.status !== "OK" || !data.results?.[0]) {
    return { ok: false, reason: "not_found" };
  }

  const r = data.results[0];
  const parsed = parseGoogleAddressComponents(r.address_components ?? []);
  const suggested: MailingFields = {
    street: parsed.street.trim(),
    city: parsed.city.trim(),
    state: parsed.state.trim(),
    zip: parsed.zip.trim(),
  };

  if (!suggested.street && !suggested.city) {
    return { ok: false, reason: "not_found" };
  }

  return {
    ok: true,
    suggested,
    formattedAddress: r.formatted_address ?? query,
  };
}
