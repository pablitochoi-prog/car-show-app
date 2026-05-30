"use client";

import { useCallback, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";

export function DashCardPrintButton({ cardCount = 1 }: { cardCount?: number }) {
  const printingRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const handlePrint = useCallback(() => {
    if (printingRef.current || typeof window === "undefined") return;

    printingRef.current = true;
    setBusy(true);

    const release = () => {
      printingRef.current = false;
      setBusy(false);
    };

    window.addEventListener("afterprint", release, { once: true });
    window.setTimeout(release, 3000);
    window.print();
  }, []);

  const label =
    cardCount === 1 ? "Print dash card" : `Print ${cardCount} dash cards`;

  return (
    <LoadingButton
      type="button"
      className="print:hidden"
      loading={busy}
      onClick={handlePrint}
    >
      {!busy && <Printer className="size-4" />}
      {busy ? "Opening print dialog…" : label}
    </LoadingButton>
  );
}
