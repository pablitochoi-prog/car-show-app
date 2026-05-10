"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Search, Pencil, Eye, ChevronUp } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ClubMembership = {
  id: string;
  role: string;
  organization: {
    id: string;
    name: string;
    clubState: string | null;
    logo: string | null;
    motto: string | null;
    organizerName: string | null;
  };
};

type SearchResult = {
  id: string;
  name: string;
  clubState: string | null;
  city: string | null;
  state: string | null;
  logo: string | null;
  motto: string | null;
  organizerName: string | null;
};

function displayName(name: string, clubState: string | null) {
  return clubState ? `${name} (${clubState})` : name;
}

function ClubLogo({ src, name }: { src: string | null; name: string }) {
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-md border bg-muted">
      {src ? (
        <Image src={src} alt={name} fill className="object-cover" sizes="40px" />
      ) : (
        <div className="flex size-full items-center justify-center text-[10px] font-bold uppercase text-muted-foreground">
          {name.slice(0, 2)}
        </div>
      )}
    </div>
  );
}

export function MyClubsSection({
  memberships: initialMemberships,
  canCreate,
}: {
  memberships: ClubMembership[];
  canCreate: boolean;
}) {
  const [memberships, setMemberships] = useState(initialMemberships);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [joining, setJoining] = useState<string | null>(null);
  const [joinMsg, setJoinMsg] = useState("");

  async function handleSearch() {
    const q = query.trim();
    if (q.length < 2) {
      setSearchError("Enter at least 2 characters.");
      return;
    }
    setSearchError("");
    setSearching(true);
    try {
      const res = await fetch(
        `/api/organizations/search?q=${encodeURIComponent(q)}`,
        { credentials: "same-origin" },
      );
      const data = (await res.json()) as { clubs?: SearchResult[]; error?: string };
      if (!res.ok) {
        setSearchError(data.error ?? "Search failed.");
        return;
      }
      setResults(data.clubs ?? []);
      if ((data.clubs ?? []).length === 0) {
        setSearchError("No clubs found matching your search.");
      }
    } catch {
      setSearchError("Network error. Try again.");
    } finally {
      setSearching(false);
    }
  }

  async function handleJoin(club: SearchResult) {
    setJoining(club.id);
    setJoinMsg("");
    try {
      const res = await fetch(`/api/organizations/${club.id}/join`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { error?: string; membershipId?: string };
      if (!res.ok) {
        setJoinMsg(data.error ?? "Could not join club.");
        return;
      }
      setMemberships((prev) => [
        ...prev,
        {
          id: data.membershipId ?? club.id,
          role: "member",
          organization: {
            id: club.id,
            name: club.name,
            clubState: club.clubState,
            logo: club.logo,
            motto: club.motto,
            organizerName: club.organizerName,
          },
        },
      ]);
      setResults((prev) => prev.filter((r) => r.id !== club.id));
      setJoinMsg(`Joined ${club.name}!`);
    } catch {
      setJoinMsg("Network error. Try again.");
    } finally {
      setJoining(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Club list at top */}
      {memberships.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            You&apos;re not a member of any clubs yet. Use the button below to
            find and join a club.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-md border">
          {memberships.map((m) => {
            const isOwner = m.role === "owner";
            return (
              <li
                key={m.id}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <ClubLogo src={m.organization.logo} name={m.organization.name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {displayName(m.organization.name, m.organization.clubState)}
                    </p>
                    {m.organization.motto && (
                      <p className="truncate text-xs italic text-muted-foreground">
                        {m.organization.motto}
                      </p>
                    )}
                    {m.organization.organizerName && (
                      <p className="text-xs text-muted-foreground">
                        Organizer: {m.organization.organizerName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/dashboard/clubs/${m.organization.id}`}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "size-8"
                    )}
                    aria-label={`View ${m.organization.name}`}
                  >
                    <Eye className="size-3.5" />
                  </Link>
                  {isOwner && (
                    <Link
                      href={`/dashboard/clubs/${m.organization.id}/edit`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "size-8"
                      )}
                      aria-label={`Edit ${m.organization.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add a club - collapsible section */}
      {!showAddPanel ? (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={() => setShowAddPanel(true)}
        >
          <Plus className="size-4" />
          Add a club
        </Button>
      ) : (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Find and join a club</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground"
              onClick={() => {
                setShowAddPanel(false);
                setResults([]);
                setSearchError("");
                setJoinMsg("");
                setQuery("");
              }}
            >
              <ChevronUp className="size-3.5" />
              Collapse
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Search by club name, city, or state
            </p>
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. PCA New Jersey"
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSearch();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                disabled={searching}
                onClick={() => void handleSearch()}
                className="shrink-0 gap-1.5"
              >
                <Search className="size-3.5" />
                {searching ? "…" : "Search"}
              </Button>
            </div>
            {searchError && (
              <p className="text-xs text-destructive">{searchError}</p>
            )}
            {joinMsg && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {joinMsg}
              </p>
            )}

            {results.length > 0 && (
              <ul className="divide-y rounded-md border bg-background">
                {results.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-start justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <ClubLogo src={r.logo} name={r.name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {displayName(r.name, r.clubState)}
                        </p>
                        {r.motto && (
                          <p className="truncate text-xs italic text-muted-foreground">
                            {r.motto}
                          </p>
                        )}
                        {r.organizerName && (
                          <p className="text-xs text-muted-foreground">
                            Organizer: {r.organizerName}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="shrink-0"
                      disabled={joining === r.id}
                      onClick={() => void handleJoin(r)}
                    >
                      {joining === r.id ? "Joining…" : "Join"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canCreate && (
            <div className="border-t pt-3">
              <Link
                href="/dashboard/clubs/new"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "w-full justify-center"
                )}
              >
                Create a new club
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
