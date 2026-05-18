"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type MakeOption = { companynum: number; company: string };
type ModelOption = { modelcat: string; basemodel: string };
type TrimOption = { model: string; basebody?: string; basedoor?: string };

function openSelectDropdown(el: HTMLSelectElement | null) {
  if (!el || el.disabled) return;
  el.focus();
  try {
    el.showPicker();
  } catch {
    el.click();
  }
}

/** Value of the option currently highlighted in a native select (keyboard or mouse). */
function highlightedSelectValue(select: HTMLSelectElement): string {
  const fromValue = select.value?.trim();
  if (fromValue) return fromValue;
  const idx = select.selectedIndex;
  if (idx > 0) return select.options[idx]?.value ?? "";
  return "";
}

export type VehicleLookupValues = {
  year: string;
  make: string;
  model: string;
  trim: string;
};

/**
 * Year / Make / Model / Trim fields with cascading NADA API lookups.
 * Includes a "My vehicle is not listed" checkbox that switches all
 * fields to free-form text inputs.
 */
export function VehicleLookupFields({
  values,
  onChange,
  idPrefix = "vlf",
}: {
  values: VehicleLookupValues;
  onChange: (v: VehicleLookupValues) => void;
  idPrefix?: string;
}) {
  const [notListed, setNotListed] = useState(false);
  const makeRef = useRef<HTMLSelectElement>(null);
  const modelRef = useRef<HTMLSelectElement>(null);
  const trimRef = useRef<HTMLSelectElement>(null);

  const [selectedCompanynum, setSelectedCompanynum] = useState<number | null>(null);
  const [selectedModelcat, setSelectedModelcat] = useState("");
  const [makes, setMakes] = useState<MakeOption[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [trims, setTrims] = useState<TrimOption[]>([]);
  const [makesLoading, setMakesLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [trimsLoading, setTrimsLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  function patch(p: Partial<VehicleLookupValues>) {
    onChange({ ...values, ...p });
  }

  const fetchMakes = useCallback(
    async (y: string, focusAfter = false) => {
      const yearNum = Number.parseInt(y, 10);
      if (!Number.isFinite(yearNum) || y.length < 4) {
        setMakes([]);
        return;
      }
      setLookupError("");
      setMakesLoading(true);
      setMakes([]);
      setModels([]);
      setTrims([]);
      setSelectedCompanynum(null);
      setSelectedModelcat("");
      try {
        const res = await fetch(`/api/vehicles/lookup/makes?year=${yearNum}`, {
          credentials: "same-origin",
        });
        const data = (await res.json()) as { makes?: MakeOption[]; error?: string };
        if (res.ok) {
          setMakes(data.makes ?? []);
          if ((data.makes ?? []).length === 0) {
            setLookupError("No makes found. Check \"My vehicle is not listed\".");
          }
        } else {
          setLookupError("Could not look up makes.");
        }
      } catch {
        setLookupError("Could not reach vehicle lookup.");
      } finally {
        setMakesLoading(false);
        if (focusAfter) {
          requestAnimationFrame(() => openSelectDropdown(makeRef.current));
        }
      }
    },
    [],
  );

  const fetchModels = useCallback(
    async (companynum: number, y: string, focusAfter = false) => {
      const yearNum = Number.parseInt(y, 10);
      if (!Number.isFinite(yearNum)) return;
      setModelsLoading(true);
      setModels([]);
      setTrims([]);
      setSelectedModelcat("");
      try {
        const res = await fetch(
          `/api/vehicles/lookup/models?companynum=${companynum}&year=${yearNum}`,
          { credentials: "same-origin" },
        );
        const data = (await res.json()) as { models?: ModelOption[] };
        if (res.ok) setModels(data.models ?? []);
      } catch {
        /* ignore */
      } finally {
        setModelsLoading(false);
        if (focusAfter) {
          requestAnimationFrame(() => openSelectDropdown(modelRef.current));
        }
      }
    },
    [],
  );

  const fetchTrims = useCallback(
    async (
      companynum: number,
      y: string,
      modelcat: string,
      focusAfter = false,
    ) => {
      const yearNum = Number.parseInt(y, 10);
      if (!Number.isFinite(yearNum) || !modelcat) return;
      setTrimsLoading(true);
      setTrims([]);
      try {
        const res = await fetch(
          `/api/vehicles/lookup/trims?companynum=${companynum}&year=${yearNum}&modelcat=${encodeURIComponent(modelcat)}`,
          { credentials: "same-origin" },
        );
        const data = (await res.json()) as { trims?: TrimOption[] };
        if (res.ok) setTrims(data.trims ?? []);
      } catch {
        /* ignore */
      } finally {
        setTrimsLoading(false);
        if (focusAfter) {
          requestAnimationFrame(() => openSelectDropdown(trimRef.current));
        }
      }
    },
    [],
  );

  function advanceFromYear() {
    if (notListed || values.year.length !== 4) return;
    if (makes.length > 0 && !makesLoading) {
      openSelectDropdown(makeRef.current);
    } else {
      void fetchMakes(values.year, true);
    }
  }

  function selectMake(val: string, focusModelAfter: boolean) {
    const selected = makes.find((m) => String(m.companynum) === val);
    if (!selected) {
      patch({ make: "", model: "", trim: "" });
      setSelectedCompanynum(null);
      setModels([]);
      setTrims([]);
      return;
    }
    patch({ make: selected.company, model: "", trim: "" });
    setSelectedCompanynum(selected.companynum);
    setSelectedModelcat("");
    setTrims([]);
    void fetchModels(selected.companynum, values.year, focusModelAfter);
  }

  function selectModel(val: string, focusTrimAfter: boolean) {
    const selected = models.find((m) => m.modelcat === val);
    if (!selected || selectedCompanynum == null) {
      patch({ model: "", trim: "" });
      setSelectedModelcat("");
      setTrims([]);
      return;
    }
    patch({ model: selected.modelcat, trim: "" });
    setSelectedModelcat(selected.modelcat);
    void fetchTrims(
      selectedCompanynum,
      values.year,
      selected.modelcat,
      focusTrimAfter,
    );
  }

  function commitMakeFromSelect(select: HTMLSelectElement) {
    const val = highlightedSelectValue(select);
    if (!val) return false;
    selectMake(val, true);
    return true;
  }

  function commitModelFromSelect(select: HTMLSelectElement) {
    const val = highlightedSelectValue(select);
    if (!val) return false;
    selectModel(val, true);
    return true;
  }

  useEffect(() => {
    if (notListed) return;
    if (values.year.length === 4) {
      void fetchMakes(values.year);
    } else {
      setMakes([]);
      setModels([]);
      setTrims([]);
    }
  }, [values.year, notListed, fetchMakes]);

  function handleMakeChange(val: string) {
    selectMake(val, false);
  }

  function handleModelChange(val: string) {
    selectModel(val, false);
  }

  function handleNotListedToggle(checked: boolean) {
    setNotListed(checked);
    if (checked) {
      setMakes([]);
      setModels([]);
      setTrims([]);
      setSelectedCompanynum(null);
      setSelectedModelcat("");
    } else {
      patch({ make: "", model: "", trim: "" });
      if (values.year.length === 4) void fetchMakes(values.year);
    }
  }

  const useDropdowns = !notListed;
  const selectClass =
    "h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none";

  return (
    <div className="space-y-3">
      {lookupError && (
        <p className="text-xs text-amber-700 dark:text-amber-300">{lookupError}</p>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: "0.5fr 1fr 1.15fr 1.35fr" }}>
        {/* Year */}
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-y`} className="text-xs">Year *</Label>
          <Input
            id={`${idPrefix}-y`}
            inputMode="numeric"
            autoComplete="off"
            placeholder="YYYY"
            value={values.year}
            onChange={(e) =>
              patch({ year: e.target.value.replace(/\D/g, "").slice(0, 4) })
            }
            onKeyDown={(e) => {
              if (e.key === "Tab" && !e.shiftKey) {
                if (values.year.length === 4 && !notListed) {
                  e.preventDefault();
                  advanceFromYear();
                }
                return;
              }
              if (e.key === "Enter") {
                e.preventDefault();
                if (values.year.length === 4 && !notListed) {
                  advanceFromYear();
                }
              }
            }}
            required
            maxLength={4}
            className="h-8 text-sm tabular-nums"
          />
        </div>

        {/* Make */}
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-mk`} className="text-xs">Make *</Label>
          {useDropdowns ? (
            <select
              ref={makeRef}
              id={`${idPrefix}-mk`}
              className={cn(selectClass)}
              value={selectedCompanynum != null ? String(selectedCompanynum) : ""}
              onChange={(e) => handleMakeChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab" && !e.shiftKey) {
                  if (commitMakeFromSelect(e.currentTarget)) {
                    e.preventDefault();
                  }
                  return;
                }
                if (e.key === "Enter") {
                  if (commitMakeFromSelect(e.currentTarget)) {
                    e.preventDefault();
                  }
                }
              }}
              required
              disabled={makesLoading}
            >
              <option value="">
                {makesLoading
                  ? "Loading…"
                  : values.year.length < 4
                    ? "Enter year"
                    : "Select make"}
              </option>
              {makes.map((m) => (
                <option key={m.companynum} value={String(m.companynum)}>
                  {m.company}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={`${idPrefix}-mk`}
              value={values.make}
              onChange={(e) => patch({ make: e.target.value })}
              required
              maxLength={100}
              autoComplete="off"
              placeholder="e.g. Chevrolet"
              className="h-8 text-sm"
            />
          )}
        </div>

        {/* Model */}
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-mo`} className="text-xs">Model *</Label>
          {useDropdowns ? (
            <select
              ref={modelRef}
              id={`${idPrefix}-mo`}
              className={cn(selectClass)}
              value={selectedModelcat}
              onChange={(e) => handleModelChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab" && !e.shiftKey) {
                  if (commitModelFromSelect(e.currentTarget)) {
                    e.preventDefault();
                  }
                  return;
                }
                if (e.key === "Enter") {
                  if (commitModelFromSelect(e.currentTarget)) {
                    e.preventDefault();
                  }
                }
              }}
              required
              disabled={modelsLoading || !selectedCompanynum}
            >
              <option value="">
                {modelsLoading
                  ? "Loading…"
                  : !selectedCompanynum
                    ? "Select make first"
                    : "Select model"}
              </option>
              {models.map((m) => (
                <option key={m.modelcat} value={m.modelcat}>
                  {m.modelcat}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={`${idPrefix}-mo`}
              value={values.model}
              onChange={(e) => patch({ model: e.target.value })}
              required
              maxLength={100}
              autoComplete="off"
              placeholder="e.g. Camaro"
              className="h-8 text-sm"
            />
          )}
        </div>

        {/* Trim */}
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-tr`} className="text-xs">Trim</Label>
          {useDropdowns ? (
            <select
              ref={trimRef}
              id={`${idPrefix}-tr`}
              className={cn(selectClass)}
              value={values.trim}
              onChange={(e) => patch({ trim: e.target.value })}
              disabled={trimsLoading || !selectedModelcat}
            >
              <option value="">
                {trimsLoading
                  ? "Loading…"
                  : !selectedModelcat
                    ? "Select model first"
                    : "(optional)"}
              </option>
              {trims.map((t, i) => (
                <option key={`${t.model}-${i}`} value={t.model}>
                  {t.model}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={`${idPrefix}-tr`}
              value={values.trim}
              onChange={(e) => patch({ trim: e.target.value })}
              autoComplete="off"
              placeholder="e.g. SS 396"
              className="h-8 text-sm"
            />
          )}
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs cursor-pointer select-none text-muted-foreground">
        <input
          type="checkbox"
          checked={notListed}
          onChange={(e) => handleNotListedToggle(e.target.checked)}
          className="size-3.5 rounded border-input accent-primary"
        />
        My vehicle is not listed
      </label>
    </div>
  );
}
