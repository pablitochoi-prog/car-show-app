export type EventCardBrandingFields = {
  logoUrl: string | null;
  orgName: string | null;
  orgLogoUrl: string | null;
};

export function eventBrandingFromEvent(event: {
  logoUrl: string | null;
  organization: { name: string; logo: string | null } | null;
}): EventCardBrandingFields {
  return {
    logoUrl: event.logoUrl,
    orgName: event.organization?.name ?? null,
    orgLogoUrl: event.organization?.logo ?? null,
  };
}

/** Logo shown on list cards: event artwork first, then sponsoring club logo. */
export function resolveEventCardLogoUrl(input: {
  logoUrl?: string | null;
  orgLogoUrl?: string | null;
}): string | null {
  return input.logoUrl?.trim() || input.orgLogoUrl?.trim() || null;
}

export function resolveEventCardLogoAlt(input: {
  name: string;
  orgName?: string | null;
}): string {
  return input.orgName?.trim() || input.name;
}
