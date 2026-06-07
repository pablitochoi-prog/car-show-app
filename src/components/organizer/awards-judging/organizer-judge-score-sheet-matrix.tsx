"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { OrganizerJudgeScoreSheetMatrixTable } from "@/components/organizer/awards-judging/organizer-judge-score-sheet-matrix-table";
import { readResponseJson } from "@/lib/read-response-json";
import type {
  JudgeMatrixJudgeOption,
  OrganizerJudgeScoreSheetMatrix,
} from "@/lib/judging/organizer-judge-score-sheet-matrix";
import { cn } from "@/lib/utils";

function apiErrorMessage(
  parsed: Awaited<ReturnType<typeof readResponseJson<{ error?: string }>>>,
  fallback: string,
): string {
  if (parsed.data?.error) return parsed.data.error;
  if (!parsed.bodyIsJson) {
    if (parsed.rawPreview) {
      return `${fallback} (server returned non-JSON response)`;
    }
    return `${fallback} (empty server response — try refreshing)`;
  }
  return fallback;
}

type JudgingClassOption = {
  id: string;
  name: string;
  templateName: string;
};

export function OrganizerJudgeScoreSheetMatrix({ eventId }: { eventId: string }) {
  const [classes, setClasses] = useState<JudgingClassOption[]>([]);
  const [judges, setJudges] = useState<JudgeMatrixJudgeOption[]>([]);
  const [matrix, setMatrix] = useState<OrganizerJudgeScoreSheetMatrix | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedJudgeId, setSelectedJudgeId] = useState<string | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingJudges, setLoadingJudges] = useState(false);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    setLoadingClasses(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/judging-classes`);
      const parsed = await readResponseJson<{
        classes?: Array<{
          id: string;
          name: string;
          templateName: string;
          isActive: boolean;
        }>;
        error?: string;
      }>(res);
      if (!parsed.ok || !parsed.data) {
        throw new Error(apiErrorMessage(parsed, "Failed to load judging classes."));
      }
      const list = (parsed.data.classes ?? []) as Array<{
        id: string;
        name: string;
        templateName: string;
        isActive: boolean;
      }>;
      const active = list
        .filter((c) => c.isActive)
        .map((c) => ({ id: c.id, name: c.name, templateName: c.templateName }));
      setClasses(active);
      setSelectedClassId((prev) => {
        if (prev && active.some((c) => c.id === prev)) return prev;
        return active[0]?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load classes.");
      setClasses([]);
      setSelectedClassId(null);
    } finally {
      setLoadingClasses(false);
    }
  }, [eventId]);

  const loadJudges = useCallback(
    async (classId: string) => {
      setLoadingJudges(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/events/${eventId}/score-sheets/results/judge-matrix?judgingClassId=${encodeURIComponent(classId)}`,
        );
        const parsed = await readResponseJson<{ judges?: JudgeMatrixJudgeOption[]; error?: string }>(
          res,
        );
        if (!parsed.ok || !parsed.data) {
          throw new Error(apiErrorMessage(parsed, "Failed to load judges."));
        }
        const list = parsed.data.judges ?? [];
        setJudges(list);
        setSelectedJudgeId((prev) => {
          if (prev && list.some((j) => j.userId === prev)) return prev;
          return list[0]?.userId ?? null;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load judges.");
        setJudges([]);
        setSelectedJudgeId(null);
      } finally {
        setLoadingJudges(false);
      }
    },
    [eventId],
  );

  const loadMatrix = useCallback(
    async (classId: string, judgeUserId: string) => {
      setLoadingMatrix(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          judgingClassId: classId,
          judgeUserId,
        });
        const res = await fetch(
          `/api/events/${eventId}/score-sheets/results/judge-matrix?${params}`,
        );
        const parsed = await readResponseJson<
          OrganizerJudgeScoreSheetMatrix & { error?: string }
        >(res);
        if (!parsed.ok || !parsed.data) {
          throw new Error(apiErrorMessage(parsed, "Failed to load matrix."));
        }
        if ("error" in parsed.data && parsed.data.error) {
          throw new Error(parsed.data.error);
        }
        setMatrix(parsed.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load matrix.");
        setMatrix(null);
      } finally {
        setLoadingMatrix(false);
      }
    },
    [eventId],
  );

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (!selectedClassId) {
      setJudges([]);
      setSelectedJudgeId(null);
      return;
    }
    void loadJudges(selectedClassId);
  }, [selectedClassId, loadJudges]);

  useEffect(() => {
    if (!selectedClassId || !selectedJudgeId || loadingJudges) {
      if (!loadingJudges) setMatrix(null);
      return;
    }
    void loadMatrix(selectedClassId, selectedJudgeId);
  }, [selectedClassId, selectedJudgeId, loadingJudges, loadMatrix]);

  if (loadingClasses) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active judging classes. Configure classes on the{" "}
        <Link
          href={`/organizer/events/${eventId}/awards-judging/score-sheets`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Score Sheet setup
        </Link>{" "}
        page first.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Compare how one judge scored deductions across every vehicle they judged in a
        class. Blank cells mean no deduction was recorded for that subcategory.
      </p>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="matrix-class" className="text-sm font-medium">
            Judging class
          </label>
          <select
            id="matrix-class"
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedClassId ?? ""}
            onChange={(e) => setSelectedClassId(e.target.value || null)}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.templateName})
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="matrix-judge" className="text-sm font-medium">
            Judge
          </label>
          <select
            id="matrix-judge"
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedJudgeId ?? ""}
            onChange={(e) => setSelectedJudgeId(e.target.value || null)}
            disabled={loadingJudges || judges.length === 0}
          >
            {judges.length === 0 ? (
              <option value="">No submitted sheets</option>
            ) : (
              judges.map((j) => (
                <option key={j.userId} value={j.userId}>
                  {j.name} ({j.sheetCount} vehicle{j.sheetCount === 1 ? "" : "s"})
                </option>
              ))
            )}
          </select>
        </div>
        {selectedClassId && selectedJudgeId && matrix && matrix.vehicles.length > 0 ? (
          <a
            href={`/api/events/${eventId}/score-sheets/results/judge-matrix/export?judgingClassId=${encodeURIComponent(selectedClassId)}&judgeUserId=${encodeURIComponent(selectedJudgeId)}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Download className="mr-2 size-4" aria-hidden />
            Export CSV
          </a>
        ) : null}
      </div>

      {loadingJudges || loadingMatrix ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : matrix && matrix.vehicles.length > 0 ? (
        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/25 px-4 py-3 text-sm">
            <p className="font-medium">{matrix.judge.name}</p>
            <p className="text-muted-foreground">{matrix.judge.email}</p>
            <p className="mt-1 text-muted-foreground">
              {matrix.judgingClass.name} · {matrix.vehicles.length} vehicle
              {matrix.vehicles.length === 1 ? "" : "s"}
            </p>
          </div>

          <OrganizerJudgeScoreSheetMatrixTable matrix={matrix} />
        </div>
      ) : selectedJudgeId && !loadingMatrix && !error ? (
        <p className="text-sm text-muted-foreground">
          No submitted score sheets for this judge in the selected class.
        </p>
      ) : null}
    </div>
  );
}
