import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { allocateUniqueVotePrefixForNewEvent } from "@/lib/event-sms-vehicle-id";
import { allocateEventShowNumber } from "@/lib/event-show-number";
import { buildClonedEventName } from "@/lib/clone-event-name";
import {
  ensureDefaultEventRoles,
  upsertStaffMemberWithRoles,
} from "@/lib/event-staff";
import { syncGeneralAdmissionTier } from "@/lib/general-admission-tier";

export async function cloneEvent(sourceEventId: string, userId: string) {
  const source = await prisma.event.findUnique({
    where: { id: sourceEventId },
    include: {
      registrationTiers: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
      eventCategories: true,
      eventAwards: true,
      roleDefinitions: true,
      staffMembers: {
        include: {
          roleLinks: { include: { role: { select: { slug: true, name: true } } } },
        },
      },
    },
  });

  if (!source) {
    throw new Error("Event not found.");
  }

  const nameCandidates = await prisma.event.findMany({
    where: source.orgId ? { orgId: source.orgId } : { orgId: null },
    select: { name: true },
  });
  const cloneName = buildClonedEventName(
    source.name,
    nameCandidates.map((e) => e.name),
  );

  const newEvent = await prisma.$transaction(async (tx) => {
    const showNumber = await allocateEventShowNumber(tx);
    const smsVotePrefix = await allocateUniqueVotePrefixForNewEvent(tx);
    const created = await tx.event.create({
      data: {
        orgId: source.orgId,
        name: cloneName,
        showNumber,
        smsVotePrefix,
        nextVehicleNumber: 1,
        clonedFromId: source.id,
        status: "DRAFT",
        estimatedCarCount: source.estimatedCarCount,
        description: source.description,
        venue: source.venue,
        street: source.street,
        city: source.city,
        state: source.state,
        zip: source.zip,
        lat: source.lat,
        lng: source.lng,
        startDate: source.startDate,
        endDate: source.endDate,
        rainDate: source.rainDate,
        startTime: source.startTime,
        endTime: source.endTime,
        isMultiDay: source.isMultiDay,
        dailyHours: source.dailyHours as Prisma.InputJsonValue | undefined,
        registrationFeeType: source.registrationFeeType,
        registrationFeeDollars: source.registrationFeeDollars,
        contactName: source.contactName,
        contactFirstName: source.contactFirstName,
        contactLastName: source.contactLastName,
        contactEmail: source.contactEmail,
        contactPhone: source.contactPhone,
        eventWebsite: source.eventWebsite,
        socialHashtag: source.socialHashtag,
        eventType: source.eventType,
        flyerUrl: source.flyerUrl,
        logoUrl: source.logoUrl,
        sponsorName: source.sponsorName,
        sponsorPrimaryContact: source.sponsorPrimaryContact,
        sponsorStreet: source.sponsorStreet,
        sponsorCity: source.sponsorCity,
        sponsorState: source.sponsorState,
        sponsorZip: source.sponsorZip,
        sponsorPhone: source.sponsorPhone,
        sponsorEmail: source.sponsorEmail,
        sponsorWebsite: source.sponsorWebsite,
        sponsorLogoUrl: source.sponsorLogoUrl,
        charityName: source.charityName,
        charityDescription: source.charityDescription,
        charityWebsite: source.charityWebsite,
        charityEmail: source.charityEmail,
        charityPhone: source.charityPhone,
        charityLogoUrl: source.charityLogoUrl,
        paymentEnabled: source.paymentEnabled,
        platformFeeMode: source.platformFeeMode,
        platformSetupFeeCollected: false,
        platformFeeType: source.platformFeeType,
        platformFeeAmountCents: source.platformFeeAmountCents,
        platformFeePercent: source.platformFeePercent,
        currency: source.currency,
        listingScheduledAt: null,
      },
    });

    if (source.registrationTiers.length > 0) {
      await tx.registrationTier.createMany({
        data: source.registrationTiers.map((tier) => ({
          eventId: created.id,
          name: tier.name,
          priceCents: tier.priceCents,
          opensAt: tier.opensAt,
          closesAt: tier.closesAt,
          memberOnly: tier.memberOnly,
          sortOrder: tier.sortOrder,
        })),
      });
    }

    if (source.eventCategories.length > 0) {
      await tx.eventCategory.createMany({
        data: source.eventCategories.map((cat) => ({
          eventId: created.id,
          categoryId: cat.categoryId,
          customName: cat.customName,
          trophyCount: cat.trophyCount,
        })),
      });
    }

    if (source.eventAwards.length > 0) {
      await tx.eventAward.createMany({
        data: source.eventAwards.map((award) => ({
          eventId: created.id,
          specialAwardId: award.specialAwardId,
          customName: award.customName,
        })),
      });
    }

    return created;
  });

  await ensureDefaultEventRoles(newEvent.id);

  const customRoles = source.roleDefinitions.filter((r) => !r.isDefault);
  for (const role of customRoles) {
    await prisma.eventRoleDefinition.create({
      data: {
        eventId: newEvent.id,
        slug: null,
        name: role.name,
        isDefault: false,
        sortOrder: role.sortOrder,
      },
    });
  }

  const newRoles = await prisma.eventRoleDefinition.findMany({
    where: { eventId: newEvent.id },
    select: { id: true, slug: true, name: true },
  });
  const roleIdBySlug = new Map(
    newRoles.filter((r) => r.slug).map((r) => [r.slug!, r.id]),
  );
  const roleIdByName = new Map(newRoles.map((r) => [r.name, r.id]));

  for (const member of source.staffMembers) {
    const roleIds = member.roleLinks
      .map((link) => {
        if (link.role.slug && roleIdBySlug.has(link.role.slug)) {
          return roleIdBySlug.get(link.role.slug)!;
        }
        return roleIdByName.get(link.role.name);
      })
      .filter((id): id is string => typeof id === "string");

    if (roleIds.length === 0) continue;
    await upsertStaffMemberWithRoles(newEvent.id, member.userId, roleIds);
  }

  const hasOrganizer = source.staffMembers.some((m) =>
    m.roleLinks.some((l) => l.role.slug === "organizer"),
  );
  if (!hasOrganizer) {
    const organizerRole = newRoles.find((r) => r.slug === "organizer");
    if (organizerRole) {
      await upsertStaffMemberWithRoles(newEvent.id, userId, [organizerRole.id]);
    }
  }

  await syncGeneralAdmissionTier(
    newEvent.id,
    newEvent.registrationFeeType ?? "FREE",
    newEvent.registrationFeeDollars,
  );

  return newEvent;
}
