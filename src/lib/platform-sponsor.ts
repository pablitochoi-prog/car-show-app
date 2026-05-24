import { prisma } from "@/lib/db";

export const PLATFORM_SPONSOR_SETTING_KEY = "platform_sponsor";

export type PlatformSponsorSettings = {
  name: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
};

const DEFAULT: PlatformSponsorSettings = {
  name: null,
  email: null,
  website: null,
  logoUrl: null,
};

function parseValue(raw: unknown): PlatformSponsorSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT };
  const v = raw as Record<string, unknown>;
  return {
    name: typeof v.name === "string" && v.name.trim() ? v.name.trim() : null,
    email:
      typeof v.email === "string" && v.email.trim() ? v.email.trim() : null,
    website:
      typeof v.website === "string" && v.website.trim()
        ? v.website.trim()
        : null,
    logoUrl:
      typeof v.logoUrl === "string" && v.logoUrl.trim()
        ? v.logoUrl.trim()
        : null,
  };
}

export async function getPlatformSponsor(): Promise<PlatformSponsorSettings> {
  const row = await prisma.globalSetting.findUnique({
    where: { key: PLATFORM_SPONSOR_SETTING_KEY },
  });
  if (!row?.value) return { ...DEFAULT };
  return parseValue(row.value);
}

export async function savePlatformSponsor(
  patch: Partial<PlatformSponsorSettings>,
): Promise<PlatformSponsorSettings> {
  const current = await getPlatformSponsor();
  const next: PlatformSponsorSettings = {
    name: patch.name !== undefined ? patch.name : current.name,
    email: patch.email !== undefined ? patch.email : current.email,
    website: patch.website !== undefined ? patch.website : current.website,
    logoUrl: patch.logoUrl !== undefined ? patch.logoUrl : current.logoUrl,
  };

  await prisma.globalSetting.upsert({
    where: { key: PLATFORM_SPONSOR_SETTING_KEY },
    update: { value: next },
    create: { key: PLATFORM_SPONSOR_SETTING_KEY, value: next },
  });

  return next;
}
