import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrganizerJudgeScoreSheetView } from "@/lib/judging/organizer-score-sheet-vehicle-detail";

function statusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function OrganizerScoreSheetReadOnly({
  sheet,
}: {
  sheet: OrganizerJudgeScoreSheetView;
}) {
  const isOriginalityCondition = sheet.methodology === "ORIGINALITY_CONDITION";

  return (
    <Card className="break-inside-avoid">
      <CardHeader>
        <CardTitle className="text-lg">{sheet.judge.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{sheet.judge.email}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">{statusLabel(sheet.status)}</Badge>
          {sheet.submittedAtLabel ? (
            <span className="text-muted-foreground">
              Submitted {sheet.submittedAtLabel}
            </span>
          ) : null}
          <span className="font-semibold text-primary">
            Final {sheet.finalScore ?? sheet.calculatedFinalScore} / {sheet.totalPoints}
          </span>
        </div>
        {isOriginalityCondition ? (
          <p className="text-xs text-muted-foreground">
            Originality deductions: {sheet.originalityDeductions} · Condition
            deductions: {sheet.conditionDeductions}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {sheet.sections.map((section, sectionIndex) => (
          <div key={section.id} className="rounded-md border p-3">
            <p className="font-medium">
              {sectionIndex + 1}. {section.name}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                Section score: {section.sectionScore}
              </span>
            </p>
            <ul className="mt-3 space-y-3">
              {section.items.map((item) => (
                <li key={item.id} className="text-sm">
                  <p className="font-medium">
                    {item.label}{" "}
                    <span className="font-normal text-muted-foreground">
                      (max {item.maxPoints} pts)
                    </span>
                  </p>
                  {sheet.methodology === "ADDITIVE" && item.awardedPoints != null ? (
                    <p className="text-muted-foreground">
                      Awarded: {item.awardedPoints} pts
                    </p>
                  ) : null}
                  {item.deductions.length > 0 ? (
                    <ul className="mt-1 list-inside list-disc text-muted-foreground">
                      {item.deductions.map((d, idx) => (
                        <li key={`${item.id}-d-${idx}`}>
                          {d.label} (-{d.pointsDeducted})
                          {d.deductionBucket
                            ? ` · ${d.deductionBucket.toLowerCase()}`
                            : ""}
                          {d.comment ? ` — “${d.comment}”` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {item.itemNotes?.trim() ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Item notes: {item.itemNotes}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {sheet.generalNotes?.trim() ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="font-medium">General notes</p>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
              {sheet.generalNotes}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
