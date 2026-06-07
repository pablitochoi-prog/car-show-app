import { Badge } from "@/components/ui/badge";
import type { OrganizerJudgeScoreSheetView } from "@/lib/judging/organizer-score-sheet-vehicle-detail";
import {
  formatOrganizerItemDeduction,
  formatOrganizerItemNotes,
  formatScorePoints,
} from "@/lib/judging/organizer-score-sheet-display";
import { cn } from "@/lib/utils";

const TABLE_GRID =
  "grid grid-cols-[minmax(12rem,3fr)_3.5rem_3.5rem_minmax(12rem,3fr)] gap-x-4 gap-y-0 text-sm sm:grid-cols-[minmax(16rem,3.5fr)_4rem_4rem_minmax(16rem,3.5fr)]";

function statusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function ScoreSheetTableHeader() {
  return (
    <div
      className={cn(
        TABLE_GRID,
        "border-b bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground",
      )}
    >
      <span>Subcategory</span>
      <span className="text-right">Max</span>
      <span className="text-right">Deduction</span>
      <span>Notes</span>
    </div>
  );
}

function ScoreSheetTableRow({
  item,
  methodology,
}: {
  item: OrganizerJudgeScoreSheetView["sections"][number]["items"][number];
  methodology: string;
}) {
  const deduction = formatOrganizerItemDeduction(item, methodology);
  const notes = formatOrganizerItemNotes(item, methodology);

  return (
    <div
      className={cn(
        TABLE_GRID,
        "items-start border-b px-3 py-2 last:border-b-0",
      )}
    >
      <p
        className={cn(
          "min-w-0 whitespace-pre-wrap break-words font-medium leading-snug",
          item.isIndented ? "pl-8" : "pl-4",
        )}
      >
        {item.label}
      </p>
      <p className="text-right tabular-nums text-muted-foreground">{item.maxPoints}</p>
      <p className="text-right tabular-nums">
        {deduction ? (
          <span className="font-medium text-amber-800 dark:text-amber-200">
            {deduction}
          </span>
        ) : (
          <span className="text-muted-foreground"> </span>
        )}
      </p>
      <p className="min-w-0 whitespace-pre-wrap break-words text-muted-foreground">
        {notes || " "}
      </p>
    </div>
  );
}

function SectionSubtotalRow({
  section,
}: {
  section: OrganizerJudgeScoreSheetView["sections"][number];
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/25 px-3 py-2.5">
      <span className="pl-4 text-sm font-semibold">Section subtotal</span>
      <span className="text-sm font-bold tabular-nums text-primary">
        {formatScorePoints(section.sectionScore)} /{" "}
        {formatScorePoints(section.sectionMax)}
      </span>
    </div>
  );
}

export function OrganizerScoreSheetReadOnly({
  sheet,
}: {
  sheet: OrganizerJudgeScoreSheetView;
}) {
  const isOriginalityCondition = sheet.methodology === "ORIGINALITY_CONDITION";
  const totalScore = sheet.finalScore ?? sheet.calculatedFinalScore;

  return (
    <div className="break-inside-avoid overflow-hidden rounded-lg border bg-card">
      <div className="border-b bg-muted/20 px-4 py-3">
        <p className="text-lg font-semibold">{sheet.judge.name}</p>
        <p className="text-sm text-muted-foreground">{sheet.judge.email}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">{statusLabel(sheet.status)}</Badge>
          {sheet.submittedAtLabel ? (
            <span className="text-muted-foreground">
              Submitted {sheet.submittedAtLabel}
            </span>
          ) : null}
        </div>
        {isOriginalityCondition ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Originality deductions: {sheet.originalityDeductions} · Condition
            deductions: {sheet.conditionDeductions}
          </p>
        ) : null}
      </div>

      <div className="border-b bg-primary/5 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Total score for this vehicle
        </p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-primary">
          {formatScorePoints(totalScore)}
          <span className="ml-1 text-lg font-semibold text-muted-foreground">
            / {formatScorePoints(sheet.totalPoints)}
          </span>
        </p>
      </div>

      <div className="space-y-4 p-4">
        {sheet.sections.map((section, sectionIndex) => (
          <section key={section.id} className="overflow-hidden rounded-md border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/25 px-3 py-2">
              <p className="font-medium">
                {sectionIndex + 1}. {section.name}
              </p>
              <p className="text-sm font-semibold tabular-nums text-primary">
                Subtotal: {formatScorePoints(section.sectionScore)} /{" "}
                {formatScorePoints(section.sectionMax)}
              </p>
            </div>
            <ScoreSheetTableHeader />
            {section.items.map((item) => (
              <ScoreSheetTableRow
                key={item.id}
                item={item}
                methodology={sheet.methodology}
              />
            ))}
            <SectionSubtotalRow section={section} />
          </section>
        ))}

        {sheet.generalNotes?.trim() ? (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <p className="font-medium">General notes</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
              {sheet.generalNotes}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
