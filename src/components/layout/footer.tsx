import Link from "next/link";
import { Car } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="layout-bar flex-col items-center gap-6 py-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-center text-sm text-muted-foreground md:text-left">
          <Car className="h-4 w-4 shrink-0" />
          <span>&copy; {new Date().getFullYear()} CarShowApp. All rights reserved.</span>
        </div>
        <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground md:justify-end">
          <Link href="/events" className="hover:text-foreground transition-colors">
            Find Events
          </Link>
          <Link href="/login" className="hover:text-foreground transition-colors">
            Log In
          </Link>
        </nav>
      </div>
    </footer>
  );
}
