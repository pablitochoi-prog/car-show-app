import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) redirect("/dashboard");

  return (
    <div className="page-shell max-w-5xl space-y-6">
      <nav className="flex flex-wrap items-center gap-4 text-sm">
        <Link href="/admin" className="font-medium hover:underline">
          Admin Home
        </Link>
        <Link href="/admin/categories" className="font-medium hover:underline">
          Categories
        </Link>
        <Link href="/admin/awards" className="font-medium hover:underline">
          Awards
        </Link>
        <Link href="/admin/messages" className="font-medium hover:underline">
          Messages
        </Link>
        <span className="ml-auto">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back to dashboard
          </Link>
        </span>
      </nav>
      {children}
    </div>
  );
}
