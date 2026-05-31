import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadSaleInquiriesForSeller } from "@/lib/vehicle-sale-inquiries-for-seller";
import { SaleInquiriesList } from "@/components/dashboard/sale-inquiries/sale-inquiries-list";

export default async function DashboardSaleInquiriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const inquiries = await loadSaleInquiriesForSeller(user.id);

  return (
    <div className="page-shell max-w-4xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sale inquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Buyer messages from vehicles you listed for sale at car shows. Reply
          directly using the contact details on each inquiry.
        </p>
      </div>

      <SaleInquiriesList inquiries={inquiries} />
    </div>
  );
}
