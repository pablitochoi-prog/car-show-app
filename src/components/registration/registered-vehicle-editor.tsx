"use client";

import { Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { RequiredFieldMark } from "@/components/registration/required-field-mark";
import { RegistrationVehiclePhoto } from "@/components/registration/registration-vehicle-photo";
import { VehicleClassSelect } from "@/components/registration/vehicle-class-select";

export type RegisteredVehicleEditorCategory = {
  id: string;
  name: string;
};

type VehicleSummary = {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
};

type Props = {
  vehicle: VehicleSummary;
  photoUrl: string | null;
  vinMask: string | null;
  showId: string | null;
  showIdPending: boolean;
  nickname: string;
  story: string;
  eventCategoryId: string | undefined;
  categories: RegisteredVehicleEditorCategory[];
  requiresVehicleClass: boolean;
  classInvalid: boolean;
  saleInquiriesEnabled: boolean;
  saleActive: boolean;
  canEditListingDetails: boolean;
  editingRemoval: boolean;
  selectedForRemoval: boolean;
  onPhotoChange: (url: string | null) => void;
  onNicknameChange: (value: string) => void;
  onStoryChange: (value: string) => void;
  onCategoryChange: (categoryId: string) => void;
  onBuyerInquiryCheck: (checked: boolean) => void;
  onEditListingDetails: () => void;
  onToggleSelected: () => void;
};

export function RegisteredVehicleEditor({
  vehicle,
  photoUrl,
  vinMask,
  showId,
  showIdPending,
  nickname,
  story,
  eventCategoryId,
  categories,
  requiresVehicleClass,
  classInvalid,
  saleInquiriesEnabled,
  saleActive,
  canEditListingDetails,
  editingRemoval,
  selectedForRemoval,
  onPhotoChange,
  onNicknameChange,
  onStoryChange,
  onCategoryChange,
  onBuyerInquiryCheck,
  onEditListingDetails,
  onToggleSelected,
}: Props) {
  const title = [
    vehicle.year,
    vehicle.make,
    vehicle.model,
    vehicle.trim?.trim() || null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={cn(
        "rounded-lg border bg-card p-4 shadow-sm",
        editingRemoval && selectedForRemoval && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {editingRemoval ? (
          <div className="flex items-start pt-1">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={selectedForRemoval}
              onChange={onToggleSelected}
              aria-label={`Select ${title}`}
            />
          </div>
        ) : null}

        <RegistrationVehiclePhoto
          vehicleId={vehicle.id}
          photoUrl={photoUrl}
          onPhotoChange={onPhotoChange}
        />

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  {!photoUrl ? (
                    <Car className="size-4 shrink-0 text-muted-foreground" />
                  ) : null}
                  <h3 className="text-base font-semibold leading-snug">{title}</h3>
                </div>
                {vinMask ? (
                  <p className="font-mono text-xs text-muted-foreground">{vinMask}</p>
                ) : null}
                {showId ? (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Show ID: </span>
                    <span className="font-mono font-semibold">{showId}</span>
                  </p>
                ) : showIdPending ? (
                  <p className="text-xs italic text-muted-foreground">
                    Show ID assigned after you save
                  </p>
                ) : null}
              </div>

              <div className="w-full shrink-0 sm:w-52">
                <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Vehicle registration class
                  {requiresVehicleClass ? <RequiredFieldMark /> : null}
                </Label>
                {requiresVehicleClass ? (
                  <VehicleClassSelect
                    value={eventCategoryId}
                    onChange={onCategoryChange}
                    categories={categories}
                    invalid={classInvalid}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No classes configured
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-1">
                {saleInquiriesEnabled ? (
                  <>
                    <label className="inline-flex max-w-full items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 rounded border-input"
                        checked={saleActive}
                        onChange={(e) => onBuyerInquiryCheck(e.target.checked)}
                      />
                      <span className="whitespace-nowrap">
                        Open to Buyer Inquiries about Vehicle
                      </span>
                    </label>
                    {canEditListingDetails ? (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto px-0 text-xs"
                        onClick={onEditListingDetails}
                      >
                        Edit listing details
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </div>

              <div className="w-full shrink-0 space-y-1.5 sm:w-52">
                <Label
                  htmlFor={`vehicle-nickname-${vehicle.id}`}
                  className="text-xs font-medium text-muted-foreground"
                >
                  Vehicle nickname
                </Label>
                <Input
                  id={`vehicle-nickname-${vehicle.id}`}
                  value={nickname}
                  onChange={(e) => onNicknameChange(e.target.value)}
                  placeholder="e.g. Black Beauty"
                  maxLength={48}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <Label htmlFor={`vehicle-story-${vehicle.id}`} className="text-sm">
                Vehicle story
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Shown on your dash card and buyer inquiry page for this event.
              </span>
            </div>
            <Textarea
              id={`vehicle-story-${vehicle.id}`}
              value={story}
              onChange={(e) => onStoryChange(e.target.value)}
              placeholder="Tell your vehicle's story for this event — history, restoration, why you're showing it..."
              maxLength={5000}
              rows={4}
              className="min-h-[6rem] w-full resize-none text-sm leading-relaxed"
            />
          </div>
        </div>
      </div>
    </article>
  );
}
