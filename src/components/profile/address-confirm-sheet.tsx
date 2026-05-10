"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { MailingFields } from "@/lib/standardize-mailing-address";

export type AddressConfirmModal =
  | null
  | {
      kind: "suggestion";
      input: MailingFields;
      suggested: MailingFields;
      formattedAddress: string;
    }
  | { kind: "not_found" };

type Props = {
  modal: AddressConfirmModal;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  onUseSuggested: (suggested: MailingFields) => void;
  onKeepOriginal: () => void;
  onSaveDespiteNotFound: () => void;
};

export function AddressConfirmSheet({
  modal,
  onOpenChange,
  loading,
  onUseSuggested,
  onKeepOriginal,
  onSaveDespiteNotFound,
}: Props) {
  return (
    <Sheet open={modal !== null} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        {modal?.kind === "suggestion" ? (
          <>
            <SheetHeader>
              <SheetTitle>Confirm your address</SheetTitle>
              <SheetDescription>
                Google Maps standardized your address differently than what you
                entered. Compare below and choose which version to save.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4">
              <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Google: </span>
                {modal.formattedAddress}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    You entered
                  </p>
                  <AddressBlock a={modal.input} />
                </div>
                <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Suggested
                  </p>
                  <AddressBlock a={modal.suggested} />
                </div>
              </div>
            </div>
            <SheetFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={loading}
                onClick={onKeepOriginal}
              >
                Keep my address
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={loading}
                onClick={() => onUseSuggested(modal.suggested)}
              >
                Use suggested address
              </Button>
            </SheetFooter>
          </>
        ) : modal?.kind === "not_found" ? (
          <>
            <SheetHeader>
              <SheetTitle>Address not verified</SheetTitle>
              <SheetDescription>
                We couldn&apos;t match this address with Google Maps. Check for
                typos, or save it exactly as you entered.
              </SheetDescription>
            </SheetHeader>
            <SheetFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={loading}
                onClick={() => onOpenChange(false)}
              >
                Go back and edit
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={loading}
                onClick={onSaveDespiteNotFound}
              >
                Save as entered
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function AddressBlock({ a }: { a: MailingFields }) {
  return (
    <div className="space-y-1 text-sm">
      <p>{a.street || "—"}</p>
      <p>
        {[a.city, a.state].filter(Boolean).join(", ")}
        {a.zip ? ` ${a.zip}` : ""}
      </p>
    </div>
  );
}
