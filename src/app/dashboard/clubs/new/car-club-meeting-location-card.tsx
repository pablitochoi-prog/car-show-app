"use client";

import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { US_STATE_CODES } from "@/lib/us-state-codes";
import { CarClubMeetingFrequencyTime } from "./car-club-meeting-frequency-time";
import { cn } from "@/lib/utils";
import {
  CAR_CLUB_INPUT_CLASS as inputClass,
  type CarClubFormValues,
} from "./car-club-form-values";

function fmtCoord(n: number) {
  return String(Math.round(n * 1e6) / 1e6);
}

const US_STATE_SET = new Set(US_STATE_CODES.map((c) => c.toUpperCase()));
const STREET_NUMBER_RE = /^\d+\s/;

/**
 * Parse a free-form location string like "VFW Post 102, Springfield, NJ"
 * or "123 Main St, Newark, NJ" into place/street + city + state.
 * Falls back to form values for city/state when not detected in the input.
 */
function parseLocationInput(
  raw: string,
  formValues: CarClubFormValues,
): { place: string; street: string; city: string; state: string } {
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);

  let state = "";
  let city = "";
  let locationPart = raw;

  if (parts.length >= 2) {
    // Check last token for a state code (might include ZIP)
    const lastTokens = parts[parts.length - 1].split(/\s+/);
    const candidate = lastTokens[0]?.toUpperCase() ?? "";
    if (US_STATE_SET.has(candidate)) {
      state = candidate;
      city = parts.length >= 3 ? parts[parts.length - 2] : "";
      locationPart = parts.length >= 3
        ? parts.slice(0, parts.length - 2).join(", ")
        : parts[0];
    } else if (parts.length >= 3) {
      // Maybe "Place, City, ST" where ST is in the middle
      const mid = parts[parts.length - 2].split(/\s+/);
      const midCandidate = mid[mid.length - 1]?.toUpperCase() ?? "";
      if (US_STATE_SET.has(midCandidate)) {
        state = midCandidate;
        city = mid.slice(0, -1).join(" ") || parts[parts.length - 2];
        locationPart = parts.slice(0, parts.length - 2).join(", ");
      }
    }
  }

  // Fall back to form field values if parsing didn't find city/state
  if (!state) state = formValues.state.trim();
  if (!city) city = formValues.city.trim();

  const loc = locationPart.trim();
  const isStreet = STREET_NUMBER_RE.test(loc);

  return {
    place: isStreet ? "" : loc,
    street: isStreet ? loc : "",
    city,
    state,
  };
}

export function CarClubMeetingLocationCard({
  v,
  patch,
}: {
  v: CarClubFormValues;
  patch: (p: Partial<CarClubFormValues>) => void;
}) {
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [addressDetailsOpen, setAddressDetailsOpen] = useState(false);

  async function handleSearch() {
    setSearchError("");

    const raw = v.primaryMeetingLocation.trim();
    if (!raw) {
      setSearchError("Enter a meeting location to search.");
      return;
    }

    // Try to parse "city, state" from the input (last two tokens after a comma)
    const { place, street, city, state } = parseLocationInput(raw, v);

    if (!city || state.length !== 2) {
      setSearchError(
        "Include a city and state in your search, e.g. \"VFW Post 102, Springfield, NJ\"."
      );
      return;
    }
    if (!place && !street) {
      setSearchError("Could not detect a venue or address. Please try again.");
      return;
    }

    setSearching(true);
    try {
      const res = await fetch("/api/maps/resolve-car-club-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          city,
          state,
          place: place || undefined,
          street: street || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        venue?: string;
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
        lat?: number;
        lng?: number;
      };

      if (!res.ok) {
        setSearchError(data.error ?? "Search failed.");
        return;
      }

      const venue =
        typeof data.venue === "string" && data.venue.trim()
          ? data.venue.trim()
          : place;
      const nextStreet = data.street ?? "";
      const nextCity = data.city ?? city;
      const nextState = data.state ?? state;
      const nextZip = data.zip ?? "";
      const lat =
        typeof data.lat === "number" && Number.isFinite(data.lat)
          ? fmtCoord(data.lat)
          : "";
      const lng =
        typeof data.lng === "number" && Number.isFinite(data.lng)
          ? fmtCoord(data.lng)
          : "";

      const summaryParts = [
        venue || nextStreet,
        [nextCity, nextState].filter(Boolean).join(", "),
        nextZip,
      ].filter(Boolean);
      const primaryMeetingLocation = summaryParts.join(" · ");

      patch({
        meetingVenueName: venue,
        street: nextStreet,
        city: nextCity,
        state: nextState,
        zip: nextZip,
        lat,
        lng,
        primaryMeetingLocation,
      });
    } catch {
      setSearchError("Could not reach location search. Try again.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Primary meeting location</CardTitle>
        <CardDescription>
          Enter the meeting location and click Search to auto-fill address
          details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Single free-form input + Search */}
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="primaryMeetingLocation">
                Primary meeting location
              </Label>
              <Input
                id="primaryMeetingLocation"
                className={inputClass}
                value={v.primaryMeetingLocation}
                onChange={(e) =>
                  patch({ primaryMeetingLocation: e.target.value })
                }
                placeholder="Venue Name + City, State or Street Address + City, State"
              />
              <p className="text-xs text-muted-foreground">
                Input meeting location, e.g., Venue Name + City, State or
                Street Address + City, State
              </p>
            </div>
            <Button
              type="button"
              className="shrink-0 gap-2 sm:mb-5"
              disabled={searching}
              onClick={() => void handleSearch()}
            >
              <Search className="size-4" aria-hidden />
              {searching ? "Searching…" : "Search"}
            </Button>
          </div>
          {searchError ? (
            <p className="text-sm text-destructive" role="alert">
              {searchError}
            </p>
          ) : null}
        </div>

        {/* Collapsible address details */}
        <div className="border-t border-border pt-3">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg py-1.5 text-left text-sm font-medium text-primary hover:underline"
            onClick={() => setAddressDetailsOpen((o) => !o)}
            aria-expanded={addressDetailsOpen}
          >
            <span>
              {addressDetailsOpen ? "Hide address details" : "See address details"}
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 transition-transform",
                addressDetailsOpen && "rotate-180"
              )}
              aria-hidden
            />
          </button>

          {addressDetailsOpen ? (
            <div className="mt-3 space-y-4 border-l-2 border-muted pl-4">
              <div className="space-y-2">
                <Label htmlFor="meetingVenueName">Venue name</Label>
                <Input
                  id="meetingVenueName"
                  className={inputClass}
                  value={v.meetingVenueName}
                  onChange={(e) => patch({ meetingVenueName: e.target.value })}
                  placeholder="e.g. Riverside VFW Post 102"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="club-street">Street address</Label>
                <Input
                  id="club-street"
                  className={inputClass}
                  value={v.street}
                  onChange={(e) => patch({ street: e.target.value })}
                  placeholder="e.g. 123 Main St"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
                <div className="space-y-2">
                  <Label htmlFor="club-city">City</Label>
                  <Input
                    id="club-city"
                    className={inputClass}
                    value={v.city}
                    onChange={(e) => patch({ city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="club-state">State</Label>
                  <select
                    id="club-state"
                    className={cn(
                      inputClass,
                      "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
                    )}
                    value={v.state}
                    onChange={(e) => patch({ state: e.target.value })}
                  >
                    <option value="">State</option>
                    {US_STATE_CODES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="club-zip">ZIP</Label>
                  <Input
                    id="club-zip"
                    className={cn(inputClass, "w-20")}
                    value={v.zip}
                    onChange={(e) => patch({ zip: e.target.value })}
                    inputMode="numeric"
                    autoComplete="postal-code"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="club-lat">Latitude</Label>
                  <Input
                    id="club-lat"
                    className={inputClass}
                    value={v.lat}
                    onChange={(e) => patch({ lat: e.target.value })}
                    placeholder="From search"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="club-lng">Longitude</Label>
                  <Input
                    id="club-lng"
                    className={inputClass}
                    value={v.lng}
                    onChange={(e) => patch({ lng: e.target.value })}
                    placeholder="From search"
                    inputMode="decimal"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <CarClubMeetingFrequencyTime v={v} patch={patch} />
      </CardContent>
    </Card>
  );
}
