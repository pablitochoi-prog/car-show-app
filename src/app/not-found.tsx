import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-shell flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        We couldn&apos;t find that page. If you scanned a dash-card QR code, the
        vehicle entry may no longer exist or the code may be invalid.
      </p>
      <Link
        href="/events"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Browse car shows
      </Link>
    </div>
  );
}
