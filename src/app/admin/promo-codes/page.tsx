import Link from "next/link";
import { AdminPromoCodesSection } from "@/components/admin/admin-promo-codes-section";
import { PROMO_CODE_FORMAT_HELP } from "@/lib/promo-codes/promo-code-charset";

export default function AdminPromoCodesPage() {
  return (
    <div className="min-w-0 space-y-6">
      <div>
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Site Admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Promo Codes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Single-use codes that waive the CarShowScout flat platform fee for one
          event. Only organizers who choose <strong>Flat Platform Fee</strong>{" "}
          can redeem an <strong>Active</strong> code.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{PROMO_CODE_FORMAT_HELP}</p>
      </div>
      <AdminPromoCodesSection />
    </div>
  );
}
