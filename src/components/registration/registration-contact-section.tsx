"use client";

import { Pencil, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RegistrationContact } from "@/lib/registration-contact";
import { formatUSPhoneDigits } from "@/lib/phone-us";

function displayPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return formatUSPhoneDigits(digits);
  return phone.trim() || "—";
}

export function RegistrationContactSection({
  contact,
  onUpdate,
  showUpdateButton = true,
}: {
  contact: RegistrationContact;
  onUpdate: () => void;
  showUpdateButton?: boolean;
}) {
  const hasAny =
    contact.firstName.trim() ||
    contact.lastName.trim() ||
    contact.email.trim() ||
    contact.phone.trim() ||
    contact.street.trim() ||
    contact.city.trim();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4" />
            Contact Information
          </CardTitle>
          {showUpdateButton && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={onUpdate}
            >
              <Pencil className="size-3.5" />
              Update
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasAny ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                First name
              </dt>
              <dd className="mt-0.5 font-medium">
                {contact.firstName.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Last name
              </dt>
              <dd className="mt-0.5 font-medium">
                {contact.lastName.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Email address
              </dt>
              <dd className="mt-0.5 break-all font-medium">
                {contact.email.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Phone number
              </dt>
              <dd className="mt-0.5 font-medium">
                {displayPhone(contact.phone)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">
                Mailing address
              </dt>
              <dd className="mt-0.5 font-medium">
                {[
                  contact.street.trim(),
                  [contact.city.trim(), contact.state.trim(), contact.zip.trim()]
                    .filter(Boolean)
                    .join(", "),
                ]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            Add your contact information so the organizer can reach you.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
