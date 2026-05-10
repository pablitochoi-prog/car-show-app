"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CAR_CLUB_INPUT_CLASS as inputClass,
  type CarClubFormValues,
} from "./car-club-form-values";
import { CarClubUpcomingActivities } from "./car-club-upcoming-activities";

export function CarClubAboutCard({
  v,
  patch,
  organizationId,
  showUpcomingInAbout = true,
}: {
  v: CarClubFormValues;
  patch: (p: Partial<CarClubFormValues>) => void;
  organizationId?: string | null;
  /** When false, upcoming activities are shown elsewhere (e.g. Edit club Events section). */
  showUpcomingInAbout?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>About us</CardTitle>
        <CardDescription>
          {showUpcomingInAbout
            ? "Tagline, story, visibility, membership, and upcoming club activities."
            : "Tagline, story, visibility, and membership."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="motto">Motto</Label>
          <Input
            id="motto"
            className={inputClass}
            value={v.motto}
            onChange={(e) => patch({ motto: e.target.value })}
            placeholder="Short tagline"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={4}
            value={v.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="What your club is about…"
          />
        </div>

        {showUpcomingInAbout ? (
          <CarClubUpcomingActivities organizationId={organizationId} />
        ) : null}

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0 rounded border-input accent-primary"
            checked={v.openToPublic}
            onChange={(e) => patch({ openToPublic: e.target.checked })}
          />
          <span>
            <span className="font-medium leading-none">
              Open listing — anyone can view / join
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Turn off to indicate the club is private or invite-only on this
              platform.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0 rounded border-input accent-primary"
            checked={v.requiresMemberAccount}
            onChange={(e) =>
              patch({ requiresMemberAccount: e.target.checked })
            }
          />
          <span>
            <span className="font-medium leading-none">
              Requires a member account on CarShowApp
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Check if participation requires signing in with a registered member
              account.
            </span>
          </span>
        </label>
      </CardContent>
    </Card>
  );
}
