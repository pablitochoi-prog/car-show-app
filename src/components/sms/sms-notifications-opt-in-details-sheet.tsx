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
import { SmsNotificationsOptInFullDisclosure } from "@/components/sms/sms-notifications-opt-in-disclosure";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId?: string;
};

export function SmsNotificationsOptInDetailsSheet({
  open,
  onOpenChange,
  contentId,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        id={contentId}
        side="bottom"
        className="max-h-[90vh] overflow-y-auto sm:mx-auto sm:max-w-lg sm:rounded-t-xl"
      >
        <SheetHeader>
          <SheetTitle>SMS notification consent</SheetTitle>
          <SheetDescription>
            Full disclosure for SMS notifications from CarShowScout.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-2">
          <SmsNotificationsOptInFullDisclosure />
        </div>
        <SheetFooter>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
