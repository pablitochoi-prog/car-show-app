import { requireUser } from "@/lib/auth";
import { SuspendedAccountBanner } from "@/components/dashboard/suspended-account-banner";
import { AdminMfaWarningBanner } from "@/components/security/admin-mfa-warning-banner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <>
      <div className="page-shell max-w-6xl pt-4">
        <SuspendedAccountBanner user={user} />
        <AdminMfaWarningBanner />
      </div>
      {children}
    </>
  );
}
