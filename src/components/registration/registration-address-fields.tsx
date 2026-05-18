"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredFieldMark } from "./required-field-mark";

export type MailingAddressValues = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

export function RegistrationAddressFields({
  values,
  onChange,
  idPrefix = "reg-addr",
  required = true,
}: {
  values: MailingAddressValues;
  onChange: (patch: Partial<MailingAddressValues>) => void;
  idPrefix?: string;
  required?: boolean;
}) {
  const mark = required ? <RequiredFieldMark /> : null;

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <p className="text-xs font-semibold text-foreground">
        Mailing address {required ? <RequiredFieldMark /> : null}
      </p>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-street`} className="text-xs">
          Street address {mark}
        </Label>
        <Input
          id={`${idPrefix}-street`}
          value={values.street}
          onChange={(e) => onChange({ street: e.target.value })}
          autoComplete="street-address"
          maxLength={200}
          className="h-9"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-1">
          <Label htmlFor={`${idPrefix}-city`} className="text-xs">
            City {mark}
          </Label>
          <Input
            id={`${idPrefix}-city`}
            value={values.city}
            onChange={(e) => onChange({ city: e.target.value })}
            autoComplete="address-level2"
            maxLength={100}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-state`} className="text-xs">
            ST {mark}
          </Label>
          <Input
            id={`${idPrefix}-state`}
            value={values.state}
            onChange={(e) =>
              onChange({ state: e.target.value.toUpperCase().slice(0, 2) })
            }
            autoComplete="address-level1"
            maxLength={2}
            placeholder="NJ"
            className="h-9 uppercase"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-zip`} className="text-xs">
            Zip {mark}
          </Label>
          <Input
            id={`${idPrefix}-zip`}
            value={values.zip}
            onChange={(e) =>
              onChange({
                zip: e.target.value.replace(/[^\d-]/g, "").slice(0, 10),
              })
            }
            autoComplete="postal-code"
            inputMode="numeric"
            maxLength={10}
            placeholder="07001"
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}
