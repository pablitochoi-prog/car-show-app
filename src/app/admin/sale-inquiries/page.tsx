import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { loadSaleInquiriesForAdmin } from "@/lib/vehicle-sale-inquiries-for-seller";
import { AdminSaleInquiriesList } from "@/components/admin/admin-sale-inquiries-list";

export default async function AdminSaleInquiriesPage() {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) redirect("/dashboard");

  const inquiries = await loadSaleInquiriesForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sale inquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {inquiries.length} buyer inquir
          {inquiries.length === 1 ? "y" : "ies"} across all events. Full buyer
          contact details are visible here for site administration only.
        </p>
      </div>

      <AdminSaleInquiriesList inquiries={inquiries} />
    </div>
  );
}
