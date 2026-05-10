"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { US_STATE_CODES } from "@/lib/us-state-codes";
import { cn } from "@/lib/utils";
import {
  CAR_CLUB_INPUT_CLASS as inputClass,
  type CarClubFormValues,
} from "./car-club-form-values";
export function CarClubDetailsMeetingSection({
  v,
  patch,
}: {
  v: CarClubFormValues;
  patch: (p: Partial<CarClubFormValues>) => void;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Club details</CardTitle>
          <CardDescription>
            Official name, home state, and when the club started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2.125fr)_minmax(0,0.375fr)_minmax(0,0.5fr)] sm:items-end">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="club-name">Club name</Label>
              <Input
                id="club-name"
                className={inputClass}
                value={v.name}
                onChange={(e) => patch({ name: e.target.value })}
                required
                minLength={2}
                placeholder="e.g. Riverside Classic Car Club"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="clubState">Club state</Label>
              <select
                id="clubState"
                className={cn(
                  inputClass,
                  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
                )}
                value={v.clubState}
                onChange={(e) => patch({ clubState: e.target.value })}
              >
                <option value="">State</option>
                {US_STATE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="yearFounded">Year founded</Label>
              <Input
                id="yearFounded"
                className={cn(inputClass, "sm:text-center")}
                value={v.yearFounded}
                onChange={(e) => patch({ yearFounded: e.target.value })}
                inputMode="numeric"
                maxLength={4}
                placeholder="1985"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
