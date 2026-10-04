import type { KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  PROGRESS_PHOTO_VIEW_LABELS,
  type MeasurementEntry,
  type ProgressPhoto,
  type ProgressPhotoView,
} from "../domain/journey";
import {
  nextStoredPhotoView,
  previousStoredPhotoView,
  storedPhotoViews,
} from "../domain/measurements";
import { formatJourneyDate } from "../utils/journeyLabels";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { cn } from "./ui/utils";
import { ZoomableImage } from "./ZoomableImage";

type PhotoStep = "previous" | "next";

const STEP_BUTTONS: Record<
  PhotoStep,
  { label: string; side: string; Icon: typeof ChevronLeft }
> = {
  previous: { label: "Previous photo", side: "left-3", Icon: ChevronLeft },
  next: { label: "Next photo", side: "right-3", Icon: ChevronRight },
};

function LightboxStepButton({
  step,
  onStep,
}: {
  step: PhotoStep;
  onStep: () => void;
}) {
  const { label, side, Icon } = STEP_BUTTONS[step];

  return (
    <Button
      aria-label={label}
      className={cn("absolute top-1/2 -translate-y-1/2", side)}
      data-parity={`lightbox-${step}`}
      onClick={onStep}
      size="icon-md"
      type="button"
      variant="outline"
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}

function LightboxStage({
  label,
  photo,
  onNext,
  onPrevious,
}: {
  label: string;
  photo: ProgressPhoto;
  onNext: (() => void) | null;
  onPrevious: (() => void) | null;
}) {
  return (
    <div className="relative flex min-h-0 flex-1">
      <ZoomableImage
        alt={`${label} photo`}
        className="flex-1 p-4 sm:px-20"
        onSwipeLeft={() => onNext?.()}
        onSwipeRight={() => onPrevious?.()}
        parity={{ stage: "lightbox-stage", image: "lightbox-image" }}
        src={photo.url}
      />

      {onPrevious && <LightboxStepButton onStep={onPrevious} step="previous" />}
      {onNext && <LightboxStepButton onStep={onNext} step="next" />}
    </div>
  );
}

function LightboxContent({
  entry,
  view,
  photo,
  onViewChange,
}: {
  entry: MeasurementEntry;
  view: ProgressPhotoView;
  photo: ProgressPhoto;
  onViewChange: (view: ProgressPhotoView) => void;
}) {
  const views = storedPhotoViews(entry);
  const label = PROGRESS_PHOTO_VIEW_LABELS[view];
  const browsable = views.length > 1;
  const showNext = () => onViewChange(nextStoredPhotoView(entry, view));
  const showPrevious = () => onViewChange(previousStoredPhotoView(entry, view));
  const stepByKey: Partial<Record<string, () => void>> = {
    ArrowLeft: showPrevious,
    ArrowRight: showNext,
  };

  const stepWithArrowKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = browsable ? stepByKey[event.key] : undefined;
    if (!step) return;

    event.preventDefault();
    step();
  };

  return (
    <DialogContent
      className="bg-surface-inverted text-surface-inverted-foreground"
      data-parity-root="PhotoLightbox"
      data-surface="inverted"
      onKeyDown={stepWithArrowKeys}
      size="screen"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="grid min-w-0 gap-1">
          <DialogTitle data-parity="lightbox-title">
            {label} ·{" "}
            <span data-parity="lightbox-counter">
              {views.indexOf(view) + 1} of {views.length}
            </span>
          </DialogTitle>
          <DialogDescription className="text-text-inverted-secondary">
            {formatJourneyDate(entry.recordedAt)}
          </DialogDescription>
        </div>
        <DialogClose asChild>
          <Button
            aria-label="Close"
            data-parity="lightbox-close"
            size="icon-md"
            type="button"
            variant="outline"
          >
            <X aria-hidden="true" />
          </Button>
        </DialogClose>
      </div>

      <LightboxStage
        key={view}
        label={label}
        onNext={browsable ? showNext : null}
        onPrevious={browsable ? showPrevious : null}
        photo={photo}
      />
    </DialogContent>
  );
}

export function PhotoLightbox({
  entry,
  view,
  onViewChange,
}: {
  entry: MeasurementEntry;
  view: ProgressPhotoView | null;
  onViewChange: (view: ProgressPhotoView | null) => void;
}) {
  const photo = view ? entry.photos[view] : undefined;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onViewChange(null);
      }}
      open={photo !== undefined}
    >
      {view && photo && (
        <LightboxContent
          entry={entry}
          onViewChange={onViewChange}
          photo={photo}
          view={view}
        />
      )}
    </Dialog>
  );
}
