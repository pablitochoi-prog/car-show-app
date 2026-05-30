import { requireUser } from "@/lib/auth";
import { SuspendedAccountBanner } from "@/components/dashboard/suspended-account-banner";

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <>
      <div className="page-shell max-w-6xl pt-4 print:hidden">
        <SuspendedAccountBanner user={user} />
      </div>
      {children}
    </>
  );
}
