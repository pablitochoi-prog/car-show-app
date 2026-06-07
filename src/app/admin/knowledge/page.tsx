import Link from "next/link";
import { AdminKnowledgeRepositorySection } from "@/components/admin/admin-knowledge-repository-section";

export default function AdminKnowledgePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Site Admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Knowledge Repository
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage Help Center articles for CarShowScout. Export to CSV for batch
          editing in Excel. CSV import is planned for Phase 3B.
        </p>
      </div>
      <AdminKnowledgeRepositorySection />
    </div>
  );
}
