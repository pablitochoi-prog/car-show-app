"use client";

import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Badge } from "@/components/ui/badge";
import type { TemplateDraft } from "@/components/organizer/awards-judging/score-sheet-types";

export function ScoreSheetTemplatePreview({ draft }: { draft: TemplateDraft }) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Preview judge form (read-only)
        </p>
        <p className="font-medium">{draft.name || "Score Sheet Template"}</p>
        {draft.description ? (
          <p className="text-sm text-muted-foreground">{draft.description}</p>
        ) : null}
        <p className="mt-1 text-sm">
          Total points: <strong>{draft.totalPoints}</strong> ·{" "}
          {draft.methodology.replace(/_/g, " ")}
        </p>
      </div>

      {draft.sections.map((section) => (
        <CollapsibleCard
          key={section.clientKey}
          title={section.name || "Judging Section"}
          badge={
            <Badge variant="outline">
              {section.items.reduce((s, i) => s + i.maxPoints, 0)} pts
            </Badge>
          }
        >
          <div className="space-y-4">
            {section.judgeGuidance ? (
              <p className="text-sm text-muted-foreground">{section.judgeGuidance}</p>
            ) : null}
            {section.items.map((item) => (
              <div
                key={item.clientKey}
                className="rounded-md border bg-background p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{item.label || "Judging Criteria"}</p>
                  <span className="shrink-0 text-muted-foreground">
                    max {item.maxPoints}
                  </span>
                </div>
                {item.judgeGuidance ? (
                  <p className="mt-1 text-muted-foreground">{item.judgeGuidance}</p>
                ) : null}
                {item.deductionOptions.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {item.deductionOptions.map((opt) => (
                      <li key={opt.clientKey}>
                        −{opt.pointsDeducted} {opt.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </CollapsibleCard>
      ))}
    </div>
  );
}
