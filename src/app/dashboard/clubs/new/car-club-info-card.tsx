"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CAR_CLUB_INPUT_CLASS as inputClass,
  type CarClubFormValues,
} from "./car-club-form-values";

export function CarClubInfoCard({
  v,
  patch,
}: {
  v: CarClubFormValues;
  patch: (p: Partial<CarClubFormValues>) => void;
}) {
  const [otherSocialOpen, setOtherSocialOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Club info</CardTitle>
        <CardDescription>
          Website and social links (https:// is added when missing).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="websiteUrl">Website</Label>
          <Input
            id="websiteUrl"
            className={inputClass}
            value={v.websiteUrl}
            onChange={(e) => patch({ websiteUrl: e.target.value })}
            placeholder="yourclub.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="facebookUrl">Facebook URL</Label>
          <Input
            id="facebookUrl"
            className={inputClass}
            value={v.facebookUrl}
            onChange={(e) => patch({ facebookUrl: e.target.value })}
          />
        </div>

        <div className="border-t border-border pt-3">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg py-1.5 text-left text-sm font-medium text-primary hover:underline"
            onClick={() => setOtherSocialOpen((o) => !o)}
            aria-expanded={otherSocialOpen}
          >
            <span>
              {otherSocialOpen
                ? "Hide other social media sites"
                : "Other social media sites"}
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 transition-transform",
                otherSocialOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>

          {otherSocialOpen ? (
            <div className="mt-3 space-y-4 border-l-2 border-muted pl-4">
              <div className="space-y-2">
                <Label htmlFor="instagramUrl">Instagram URL</Label>
                <Input
                  id="instagramUrl"
                  className={inputClass}
                  value={v.instagramUrl}
                  onChange={(e) => patch({ instagramUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtubeUrl">YouTube URL</Label>
                <Input
                  id="youtubeUrl"
                  className={inputClass}
                  value={v.youtubeUrl}
                  onChange={(e) => patch({ youtubeUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tikTokUrl">TikTok URL</Label>
                <Input
                  id="tikTokUrl"
                  className={inputClass}
                  value={v.tikTokUrl}
                  onChange={(e) => patch({ tikTokUrl: e.target.value })}
                />
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
