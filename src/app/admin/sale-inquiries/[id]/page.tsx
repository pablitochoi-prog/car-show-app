import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { formatUsdWholeDollars } from "@/lib/money";
import {
  saleInquiryStatusLabel,
  saleInquiryStatusVariant,
} from "@/lib/sale-inquiry-status";
import { loadSaleInquiryForAdmin } from "@/lib/vehicle-sale-inquiries-for-seller";
import { PolicyPageContent } from "@/components/legal/policy-page-content";

type Props = {
  params: Promise<{ id: string }>;
};

function formatSubmittedAt(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function AdminSaleInquiryDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) redirect("/dashboard");

  const { id } = await params;
  const inquiry = await loadSaleInquiryForAdmin(id);
  if (!inquiry) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/sale-inquiries"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Sale inquiries
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inquiry detail</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted {formatSubmittedAt(inquiry.submittedAt)}
          </p>
        </div>
        <Badge variant={saleInquiryStatusVariant(inquiry.status)}>
          {saleInquiryStatusLabel(inquiry.status)}
        </Badge>
      </div>

      <section className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Event &amp; vehicle
        </h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-muted-foreground">Event</dt>
          <dd>{inquiry.eventLabel}</dd>
          <dt className="text-muted-foreground">Vehicle</dt>
          <dd>{inquiry.vehicleLabel}</dd>
          {inquiry.vehicleEntryCode ? (
            <>
              <dt className="text-muted-foreground">Vehicle ID</dt>
              <dd className="font-mono">{inquiry.vehicleEntryCode}</dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">Listing ID</dt>
          <dd className="font-mono text-xs">{inquiry.listingId}</dd>
          {inquiry.sellerUserId ? (
            <>
              <dt className="text-muted-foreground">Seller user</dt>
              <dd className="font-mono text-xs">{inquiry.sellerUserId}</dd>
            </>
          ) : null}
        </dl>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Buyer contact
        </h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-muted-foreground">Name</dt>
          <dd>{inquiry.buyerName}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd>
            <a
              href={`mailto:${encodeURIComponent(inquiry.buyerEmail)}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {inquiry.buyerEmail}
            </a>
          </dd>
          {inquiry.buyerPhone ? (
            <>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{inquiry.buyerPhone}</dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">SMS opt-in</dt>
          <dd>{inquiry.smsNotificationsOptIn ? "Yes" : "No"}</dd>
          {inquiry.offerAmountCents != null ? (
            <>
              <dt className="text-muted-foreground">Offer</dt>
              <dd className="font-semibold">
                {formatUsdWholeDollars(inquiry.offerAmountCents / 100)}
              </dd>
            </>
          ) : null}
        </dl>
        {inquiry.message?.trim() ? (
          <div className="space-y-1 border-t pt-3">
            <p className="text-sm font-medium text-muted-foreground">Message</p>
            <PolicyPageContent
              html={inquiry.message}
              className="text-sm text-foreground"
            />
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Delivery &amp; audit
        </h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-muted-foreground">Email sent</dt>
          <dd>
            {inquiry.notificationEmailSentAt
              ? formatSubmittedAt(inquiry.notificationEmailSentAt)
              : "—"}
          </dd>
          <dt className="text-muted-foreground">SMS sent</dt>
          <dd>
            {inquiry.notificationSmsSentAt
              ? formatSubmittedAt(inquiry.notificationSmsSentAt)
              : "—"}
          </dd>
          <dt className="text-muted-foreground">Contacted</dt>
          <dd>
            {inquiry.contactedAt
              ? formatSubmittedAt(inquiry.contactedAt)
              : "—"}
          </dd>
          <dt className="text-muted-foreground">SMS opt-in at</dt>
          <dd>
            {inquiry.smsNotificationsOptInAt
              ? formatSubmittedAt(inquiry.smsNotificationsOptInAt)
              : "—"}
          </dd>
          <dt className="text-muted-foreground">SMS consent source</dt>
          <dd>{inquiry.smsNotificationsOptInSource ?? "—"}</dd>
          <dt className="text-muted-foreground">SMS consent version</dt>
          <dd>{inquiry.smsNotificationsConsentTextVersion ?? "—"}</dd>
          <dt className="text-muted-foreground">IP hash</dt>
          <dd className="font-mono text-xs">{inquiry.ipHash ?? "—"}</dd>
          <dt className="text-muted-foreground">User-agent hash</dt>
          <dd className="font-mono text-xs break-all">
            {inquiry.userAgentHash ?? "—"}
          </dd>
        </dl>
      </section>
    </div>
  );
}
