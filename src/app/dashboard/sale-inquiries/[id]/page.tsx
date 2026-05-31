import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { formatUsdWholeDollars } from "@/lib/money";
import {
  saleInquiryStatusLabel,
  saleInquiryStatusVariant,
} from "@/lib/sale-inquiry-status";
import { loadSaleInquiryForSeller } from "@/lib/vehicle-sale-inquiries-for-seller";
import { SaleInquiryDetailActions } from "@/components/dashboard/sale-inquiries/sale-inquiry-detail-actions";
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

export default async function DashboardSaleInquiryDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const inquiry = await loadSaleInquiryForSeller(user.id, id);
  if (!inquiry) notFound();

  return (
    <div className="page-shell max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/sale-inquiries"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Sale inquiries
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buyer inquiry</h1>
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
              <dd>
                <a
                  href={`tel:${inquiry.buyerPhone.replace(/\D/g, "")}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {inquiry.buyerPhone}
                </a>
              </dd>
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

      <SaleInquiryDetailActions
        inquiryId={inquiry.id}
        status={inquiry.status}
      />
    </div>
  );
}
