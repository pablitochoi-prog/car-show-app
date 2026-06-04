"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Info, Mic, MicOff, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { JudgingMethodology } from "@prisma/client";
import {
  computeItemLineDeduction,
  levelButtonLabel,
} from "@/lib/judging/judge-scorecard-line-deduction";
import { itemDraftMissingRequiredComment } from "@/lib/judging/scorecard-required-comment";
import {
  getMicrophonePermissionState,
  getSpeechDictationBlocker,
  isSpeechDictationSupported,
  requestMicrophoneForDictation,
  speechDictationErrorMessage,
  startSpeechDictationHandlers,
  type SpeechDictationSession,
} from "@/lib/speech-dictation";

export type ScorecardItemRowData = {
  id: string;
  label: string;
  maxPoints: number;
  scoringType: string;
  allowMultipleViolations: boolean;
  judgeGuidance: string | null;
  requiresCommentOnDeduction: boolean;
  deductionOptions: Array<{ id: string; label: string; pointsDeducted: number }>;
};

export type ScorecardItemDraft = {
  discretionaryPoints: string;
  selectedOptionIds: string[];
  violationCounts: Record<string, string>;
  itemNotes: string;
};

type Props = {
  item: ScorecardItemRowData;
  draft: ScorecardItemDraft;
  methodology: JudgingMethodology;
  editable: boolean;
  isLast?: boolean;
  onDraftChange: (next: ScorecardItemDraft) => void;
  onShowGuidance: (title: string, text: string) => void;
  onToggleOption: (optionId: string) => void;
};

function LineDeductionBadge({
  deduction,
  maxPoints,
}: {
  deduction: number;
  maxPoints: number;
}) {
  const active = deduction > 0;
  return (
    <div
      className={cn(
        "flex h-11 w-[3.25rem] shrink-0 flex-col items-center justify-center rounded-lg border px-1 tabular-nums",
        active
          ? "border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-100"
          : "border-border/60 bg-muted/30 text-muted-foreground",
      )}
      title={`Deduction applied (max ${maxPoints} for this subcategory)`}
    >
      <span className="text-[9px] font-medium uppercase leading-none tracking-wide">
        Ded
      </span>
      <span className="text-base font-bold leading-tight">
        {active ? `−${deduction}` : "0"}
      </span>
    </div>
  );
}

const THUMB_BTN =
  "min-h-[44px] touch-manipulation rounded-lg px-1.5 text-xs font-semibold leading-tight sm:text-sm";

function ScorecardNoteDialog({
  open,
  itemLabel,
  requiresComment,
  initialNote,
  editable,
  onClose,
  onSave,
}: {
  open: boolean;
  itemLabel: string;
  requiresComment: boolean;
  initialNote: string;
  editable: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
}) {
  const [noteText, setNoteText] = useState(initialNote);
  const [listening, setListening] = useState(false);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [dictationHint, setDictationHint] = useState<string | null>(null);
  const dictationSupported = isSpeechDictationSupported();
  const dictationSessionRef = useRef<SpeechDictationSession | null>(null);
  const dictationPrefixRef = useRef("");

  useEffect(() => {
    if (open) {
      setNoteText(initialNote);
      setDictationError(null);
      setDictationHint(null);
      void getMicrophonePermissionState().then((state) => {
        if (state === "denied") {
          setDictationHint(
            speechDictationErrorMessage("not-allowed", {
              host:
                typeof window !== "undefined" ? window.location.host : undefined,
            }),
          );
        }
      });
    }
  }, [open, initialNote]);

  const stopDictation = useCallback(() => {
    dictationSessionRef.current?.stop();
    dictationSessionRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => {
    if (!open) stopDictation();
  }, [open, stopDictation]);

  useEffect(() => () => stopDictation(), [stopDictation]);

  async function toggleDictation() {
    if (!editable) return;

    if (listening) {
      stopDictation();
      return;
    }

    const blocker = getSpeechDictationBlocker();
    if (blocker) {
      setDictationError(
        speechDictationErrorMessage(blocker, {
          host: typeof window !== "undefined" ? window.location.host : undefined,
        }),
      );
      return;
    }

    setDictationError(null);
    setDictationHint(null);
    dictationPrefixRef.current = noteText.trimEnd();

    const mic = await requestMicrophoneForDictation();
    if (!mic.ok) {
      setDictationError(
        speechDictationErrorMessage(mic.code, {
          host: typeof window !== "undefined" ? window.location.host : undefined,
        }),
      );
      return;
    }

    const session = startSpeechDictationHandlers({
      microphoneGranted: true,
      onListeningChange: setListening,
      onTranscript: (phrase, isFinal) => {
        if (isFinal) {
          const next = dictationPrefixRef.current
            ? `${dictationPrefixRef.current} ${phrase}`
            : phrase;
          dictationPrefixRef.current = next.trim();
          setNoteText(dictationPrefixRef.current);
        } else {
          setNoteText(
            dictationPrefixRef.current
              ? `${dictationPrefixRef.current} ${phrase}`
              : phrase,
          );
        }
      },
      onError: (code) => {
        const msg = speechDictationErrorMessage(code, {
          host: typeof window !== "undefined" ? window.location.host : undefined,
        });
        if (msg) setDictationError(msg);
        stopDictation();
      },
    });

    if (session) dictationSessionRef.current = session;
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scorecard-note-title"
    >
      <button
        type="button"
        className="fixed inset-0 bg-black/50"
        aria-label="Close note dialog"
        onClick={onClose}
      />
      <div className="relative mx-2 mb-2 w-full max-w-md rounded-xl border bg-background p-4 shadow-lg sm:mb-0">
        <h3 id="scorecard-note-title" className="text-base font-semibold leading-snug">
          Note — {itemLabel}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {requiresComment
            ? "A note is required when you apply a deduction (required before submit)."
            : "A note explaining the deduction is recommended but optional."}
        </p>
        <Textarea
          rows={4}
          disabled={!editable}
          className="mt-3 min-h-[6rem] text-sm"
          placeholder="Type or dictate your note…"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />
        {editable ? (
          <div className="mt-2 space-y-1.5">
            {dictationSupported ? (
              <Button
                type="button"
                variant={listening ? "destructive" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => void toggleDictation()}
              >
                {listening ? (
                  <>
                    <MicOff className="size-4" />
                    Stop dictation
                  </>
                ) : (
                  <>
                    <Mic className="size-4" />
                    Dictate
                  </>
                )}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Dictation is not available in this browser. Type your note or use the
                keyboard microphone key.
              </p>
            )}
            {dictationHint && !dictationError ? (
              <p className="text-xs text-amber-700 dark:text-amber-400" role="status">
                {dictationHint}
              </p>
            ) : null}
            {dictationError ? (
              <p className="text-xs text-destructive" role="alert">
                {dictationError}
              </p>
            ) : null}
            {listening ? (
              <p className="text-xs text-muted-foreground">Listening… speak your note.</p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={!editable}
            onClick={() => {
              stopDictation();
              onSave(noteText);
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export function JudgeScorecardItemRow({
  item,
  draft,
  methodology,
  editable,
  isLast = false,
  onDraftChange,
  onShowGuidance,
  onToggleOption,
}: Props) {
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const hasNote = draft.itemNotes.trim().length > 0;
  const missingRequiredNote = itemDraftMissingRequiredComment(item, draft);
  const lineDeduction = computeItemLineDeduction(item, draft, methodology);

  const fullOpt = item.deductionOptions[0];
  const fullSelected = fullOpt
    ? draft.selectedOptionIds.includes(fullOpt.id)
    : false;
  const isLevels = item.scoringType === "LEVELS";

  return (
    <>
      <div
        className={cn(
          "relative space-y-2 py-3",
          !editable && "opacity-80",
        )}
      >
        <p className="text-sm leading-snug">
          <span className="font-medium text-foreground">{item.label}</span>
          <span className="font-normal text-muted-foreground">
            {" "}
            (Max {item.maxPoints})
          </span>
          {item.judgeGuidance ? (
            <button
              type="button"
              className="ml-1 inline-flex align-middle text-primary"
              aria-label={`Guidance for ${item.label}`}
              onClick={() => onShowGuidance(item.label, item.judgeGuidance!)}
            >
              <Info className="size-4" />
            </button>
          ) : null}
        </p>

        <div className="flex items-stretch gap-2">
          <div
            className={cn(
              "flex min-w-0 flex-1 items-stretch gap-2",
              isLevels &&
                (item.deductionOptions.length === 3
                  ? "grid grid-cols-3 gap-2"
                  : "flex flex-wrap gap-2"),
            )}
          >
            {item.scoringType === "DISCRETIONARY" ? (
              <Input
                type="number"
                min={0}
                max={item.maxPoints}
                inputMode="numeric"
                disabled={!editable}
                placeholder={`0–${item.maxPoints}`}
                className={cn(THUMB_BTN, "max-w-[6rem] text-base")}
                value={draft.discretionaryPoints}
                onChange={(e) =>
                  onDraftChange({ ...draft, discretionaryPoints: e.target.value })
                }
              />
            ) : item.scoringType === "FULL" && fullOpt ? (
              <div className="flex min-w-0 flex-1 flex-wrap items-stretch gap-2">
                <Button
                  type="button"
                  variant={fullSelected ? "default" : "outline"}
                  disabled={!editable}
                  className={cn(THUMB_BTN, "min-w-[5.5rem] flex-1 px-3")}
                  onClick={() => onToggleOption(fullOpt.id)}
                >
                  {fullSelected ? "Observed" : "Not obs."}
                </Button>
                {item.allowMultipleViolations && fullSelected ? (
                  <Input
                    type="number"
                    min={1}
                    disabled={!editable}
                    aria-label="Violation count"
                    className={cn(THUMB_BTN, "w-16 text-base")}
                    value={draft.violationCounts[fullOpt.id] ?? "1"}
                    onChange={(e) =>
                      onDraftChange({
                        ...draft,
                        violationCounts: {
                          ...draft.violationCounts,
                          [fullOpt.id]: e.target.value,
                        },
                      })
                    }
                  />
                ) : null}
              </div>
            ) : isLevels ? (
              item.deductionOptions.map((opt) => {
                const selected = draft.selectedOptionIds.includes(opt.id);
                return (
                  <Button
                    key={opt.id}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    disabled={!editable}
                    className={cn(
                      THUMB_BTN,
                      "h-11",
                      item.deductionOptions.length === 3 ? "w-full" : "min-w-[3.5rem] flex-1",
                      selected && "ring-2 ring-primary ring-offset-1",
                    )}
                    aria-pressed={selected}
                    aria-label={`${levelButtonLabel(opt.label)}, deducts ${opt.pointsDeducted} points`}
                    onClick={() => onToggleOption(opt.id)}
                  >
                    {levelButtonLabel(opt.label)}
                  </Button>
                );
              })
            ) : (
              item.deductionOptions.map((opt) => {
                const selected = draft.selectedOptionIds.includes(opt.id);
                return (
                  <Button
                    key={opt.id}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    disabled={!editable}
                    className={cn(THUMB_BTN, "shrink-0 px-3")}
                    onClick={() => onToggleOption(opt.id)}
                  >
                    {opt.label}
                  </Button>
                );
              })
            )}
          </div>

          <LineDeductionBadge deduction={lineDeduction} maxPoints={item.maxPoints} />

          <Button
            type="button"
            variant={
              missingRequiredNote ? "destructive" : hasNote ? "secondary" : "outline"
            }
            size="icon"
            disabled={!editable && !hasNote}
            className={cn(
              "size-11 shrink-0 touch-manipulation rounded-lg",
              hasNote && !missingRequiredNote && "border-primary/40",
              missingRequiredNote && "ring-2 ring-destructive ring-offset-1",
            )}
            aria-label={
              missingRequiredNote
                ? "Add required note for this deduction"
                : hasNote
                  ? "Edit note"
                  : "Add note"
            }
            aria-invalid={missingRequiredNote}
            onClick={() => setNoteDialogOpen(true)}
          >
            <StickyNote
              className={cn("size-5", (hasNote || missingRequiredNote) && "fill-current")}
            />
          </Button>
        </div>

        {!isLast ? (
          <div
            className="absolute bottom-0 left-0 h-px w-2/3 bg-border"
            aria-hidden
          />
        ) : null}
      </div>

      <ScorecardNoteDialog
        open={noteDialogOpen}
        itemLabel={item.label}
        requiresComment={item.requiresCommentOnDeduction}
        initialNote={draft.itemNotes}
        editable={editable}
        onClose={() => setNoteDialogOpen(false)}
        onSave={(note) => {
          onDraftChange({ ...draft, itemNotes: note });
          setNoteDialogOpen(false);
        }}
      />
    </>
  );
}
