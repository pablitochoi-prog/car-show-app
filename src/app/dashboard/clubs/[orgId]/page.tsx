import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatOrgNameWithClubState } from "@/lib/format-org-display-name";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ClubEventCard, type ClubEvent } from "@/components/dashboard/clubs/club-event-card";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="grid gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default async function ViewClubPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await params;

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: user.id, orgId } },
    include: { organization: true },
  });

  if (!membership) notFound();

  const org = membership.organization;
  const isOwner = membership.role === "owner";
  const displayName = formatOrgNameWithClubState(org.name, org.clubState);
  const addressLine = [org.city, org.state].filter(Boolean).join(", ") + (org.zip ? ` ${org.zip}` : "");
  const contactName = [org.contactFirstName, org.contactLastName].filter(Boolean).join(" ");

  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const eventRows = await prisma.event.findMany({
    where: {
      orgId,
      status: { in: ["SCHEDULED", "PUBLISHED", "ACTIVE", "CLOSED", "VOTING"] },
      startDate: { gte: threeMonthsAgo },
    },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      name: true,
      venue: true,
      city: true,
      state: true,
      lat: true,
      lng: true,
      startDate: true,
      startTime: true,
      endTime: true,
      contactName: true,
      contactFirstName: true,
      contactLastName: true,
      contactEmail: true,
      contactPhone: true,
      registrationFeeType: true,
      registrationFeeDollars: true,
      status: true,
    },
  });

  const events: ClubEvent[] = eventRows.map((e) => {
    const cName =
      [e.contactFirstName, e.contactLastName].filter(Boolean).join(" ") ||
      e.contactName;
    const isPast = e.startDate < now;
    return {
      id: e.id,
      name: e.name,
      venue: e.venue,
      city: e.city,
      state: e.state,
      lat: e.lat,
      lng: e.lng,
      startDate: e.startDate.toISOString(),
      startTime: e.startTime,
      endTime: e.endTime,
      contactName: cName,
      contactEmail: e.contactEmail,
      contactPhone: e.contactPhone,
      registrationFeeType: e.registrationFeeType,
      registrationFeeDollars: e.registrationFeeDollars,
      status: e.status,
      isPast,
    };
  });

  const upcomingEvents = events.filter((e) => !e.isPast);
  const pastEvents = events.filter((e) => e.isPast);

  return (
    <div className="page-shell max-w-2xl space-y-8">
      <div className="page-head flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{displayName}</h1>
          {org.motto && (
            <p className="mt-1 text-sm italic text-muted-foreground">
              {org.motto}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <Link
              href={`/dashboard/clubs/${orgId}/edit`}
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              Edit club
            </Link>
          )}
          <Link
            href="/dashboard/clubs"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to clubs
          </Link>
        </div>
      </div>

      {org.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{org.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Events section */}
      {events.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Events</h2>

          {upcomingEvents.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Upcoming ({upcomingEvents.length})
              </h3>
              {upcomingEvents.map((e) => (
                <ClubEventCard key={e.id} event={e} />
              ))}
            </div>
          )}

          {pastEvents.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Recently completed ({pastEvents.length})
              </h3>
              {pastEvents.map((e) => (
                <ClubEventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </section>
      )}

      {events.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No upcoming or recent events for this club.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Club details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Year founded" value={org.yearFounded?.toString()} />
          <Field label="Club state" value={org.clubState} />
          <Field
            label="Open to public"
            value={org.openToPublic ? "Yes" : "No"}
          />
          <Field label="Your role" value={membership.role} />
        </CardContent>
      </Card>

      {(org.primaryMeetingLocation || org.meetingVenueName || org.street || addressLine.trim()) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Meeting location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Location" value={org.primaryMeetingLocation} />
            <Field label="Venue" value={org.meetingVenueName} />
            <Field label="Street" value={org.street} />
            {addressLine.trim() && (
              <Field label="City / State / ZIP" value={addressLine} />
            )}
            <Field label="Meeting frequency" value={org.meetingFrequency} />
            <Field label="Meeting time" value={org.meetingTime} />
          </CardContent>
        </Card>
      )}

      {(contactName || org.contactEmail || org.contactPhone) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Name" value={contactName} />
            <Field label="Role" value={org.contactRole} />
            <Field label="Email" value={org.contactEmail} />
            <Field label="Phone" value={org.contactPhone} />
          </CardContent>
        </Card>
      )}

      {(org.websiteUrl || org.facebookUrl || org.instagramUrl || org.youtubeUrl || org.tikTokUrl) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              { label: "Website", url: org.websiteUrl },
              { label: "Facebook", url: org.facebookUrl },
              { label: "Instagram", url: org.instagramUrl },
              { label: "YouTube", url: org.youtubeUrl },
              { label: "TikTok", url: org.tikTokUrl },
            ]
              .filter((l) => l.url)
              .map((l) => (
                <div key={l.label} className="grid gap-1">
                  <span className="text-muted-foreground">{l.label}</span>
                  <a
                    href={l.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline break-all"
                  >
                    {l.url}
                  </a>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
