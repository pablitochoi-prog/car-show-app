import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatUsdWholeDollars } from "@/lib/money";
import {
  saleInquiryStatusLabel,
  saleInquiryStatusVariant,
} from "@/lib/sale-inquiry-status";
import type { SellerInquiryListItem } from "@/lib/vehicle-sale-inquiries-for-seller";

function formatSubmittedAt(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function AdminSaleInquiriesList({
  inquiries,
}: {
  inquiries: SellerInquiryListItem[];
}) {
  if (inquiries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        No vehicle sale inquiries have been submitted yet.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {inquiries.map((inquiry) => (
        <li key={inquiry.id}>
          <Link
            href={`/admin/sale-inquiries/${inquiry.id}`}
            className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-muted/40 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{inquiry.buyerName}</p>
                <Badge variant={saleInquiryStatusVariant(inquiry.status)}>
                  {saleInquiryStatusLabel(inquiry.status)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{inquiry.buyerEmail}</p>
              <p className="text-sm text-muted-foreground">
                {inquiry.vehicleLabel}
                {inquiry.vehicleEntryCode
                  ? ` · ${inquiry.vehicleEntryCode}`
                  : ""}{" "}
                · {inquiry.eventLabel}
              </p>
            </div>
            <div className="shrink-0 text-left text-sm lg:text-right">
              <p className="text-muted-foreground">
                {formatSubmittedAt(inquiry.submittedAt)}
              </p>
              {inquiry.offerAmountCents != null ? (
                <p className="font-medium text-foreground">
                  Offer {formatUsdWholeDollars(inquiry.offerAmountCents / 100)}
                </p>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
