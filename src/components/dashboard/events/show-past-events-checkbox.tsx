"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";

export function ShowPastEventsCheckbox({ checked }: { checked: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(next: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "participating");
    if (next) {
      params.set("past", "1");
    } else {
      params.delete("past");
    }
    params.delete("page");
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        id="show-past-events"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border border-input accent-primary"
      />
      <Label htmlFor="show-past-events" className="cursor-pointer text-sm font-normal">
        Show past events
      </Label>
    </div>
  );
}
