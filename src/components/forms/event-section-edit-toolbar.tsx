"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EventSectionEditToolbar({
  editing,
  busy = false,
  onStartEdit,
  onDone,
}: {
  editing: boolean;
  busy?: boolean;
  onStartEdit: () => void;
  onDone: () => void;
}) {
  return (
    <div className="flex justify-end">
      {!editing ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onStartEdit}
        >
          <Pencil className="size-3.5" />
          Edit
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={onDone}
        >
          Done
        </Button>
      )}
    </div>
  );
}
