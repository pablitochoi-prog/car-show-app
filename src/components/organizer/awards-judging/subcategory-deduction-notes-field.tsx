"use client";

type Props = {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

/** Subcategory template flag: required note vs recommended optional note on deductions. */
export function SubcategoryDeductionNotesField({
  checked,
  disabled = false,
  onChange,
}: Props) {
  return (
    <div className="max-w-md space-y-1">
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 rounded border"
        />
        <span className="font-medium">Notes required for deduction</span>
      </label>
      <p className="pl-6 text-xs text-muted-foreground">
        {checked
          ? "Judges must enter a note before submitting when a deduction is applied on this subcategory."
          : "A note explaining the deduction is recommended but optional before submit."}
      </p>
    </div>
  );
}
