"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashCardPrintButton() {
  return (
    <Button
      type="button"
      className="print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="size-4" />
      Print dash card
    </Button>
  );
}
