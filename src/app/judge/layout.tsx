import { requireUser } from "@/lib/auth";

export default async function JudgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <div className="page-shell mx-auto min-h-screen max-w-lg pb-4 pt-4">
      {children}
    </div>
  );
}
