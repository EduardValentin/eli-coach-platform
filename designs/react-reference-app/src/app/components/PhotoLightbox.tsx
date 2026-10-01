import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  PROGRESS_PHOTO_VIEW_LABELS,
  type MeasurementEntry,
  type ProgressPhoto,
  type ProgressPhotoView,
} from '../domain/journey';
import {
  nextStoredPhotoView,
  previousStoredPhotoView,
  storedPhotoViews,
} from '../domain/measurements';
import { formatJourneyDate } from '../utils/journeyLabels';
import { Button } from './ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';
import { cn } from './ui/utils';
import { usePhotoGestures } from './usePhotoGestures';

type Zoom = { scale: 1 } | { scale: 2; origin: string };

const FITTED: Zoom = { scale: 1 };

function originUnder(event: PointerEvent<HTMLElement>, image: HTMLElement) {
  const frame = image.getBoundingClientRect();
  if (frame.width === 0 || frame.height === 0) return 'center';

  const percentAlong = (offset: number, length: number) =>
    Math.min(100, Math.max(0, (offset / length) * 100));

  return `${percentAlong(event.clientX - frame.left, frame.width)}% ${percentAlong(event.clientY - frame.top, frame.height)}%`;
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
  const [zoom, setZoom] = useState<Zoom>(FITTED);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  const toggleZoom = (event: PointerEvent<HTMLElement>) => {
    setZoom((current) =>
      current.scale === 1 && image
        ? { scale: 2, origin: originUnder(event, image) }
        : FITTED,
    );
  };

  const gestures = usePhotoGestures({
    onSwipeLeft: () => onNext?.(),
    onSwipeRight: () => onPrevious?.(),
    onDoubleTap: toggleZoom,
  });

  return (
    <div className="relative flex min-h-0 flex-1">
      <div
        className="flex min-w-0 flex-1 touch-pinch-zoom items-center justify-center overflow-hidden p-4 select-none sm:px-20"
        {...gestures}
      >
        <img
          alt={`${label} photo`}
          className={cn(
            'max-h-full max-w-full object-contain transition-transform duration-200 motion-reduce:transition-none',
            {
              'cursor-zoom-in': zoom.scale === 1,
              'cursor-zoom-out': zoom.scale === 2,
            },
          )}
          data-parity="lightbox-image"
          draggable={false}
          ref={setImage}
          src={photo.url}
          style={{
            transform: `scale(${zoom.scale})`,
            transformOrigin: zoom.scale === 2 ? zoom.origin : 'center',
          }}
        />
      </div>

      {onPrevious && (
        <Button
          aria-label="Previous photo"
          className="absolute top-1/2 left-3 -translate-y-1/2 shadow-card"
          data-parity="lightbox-previous"
          onClick={onPrevious}
          size="icon-md"
          type="button"
          variant="outline"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
      )}
      {onNext && (
        <Button
          aria-label="Next photo"
          className="absolute top-1/2 right-3 -translate-y-1/2 shadow-card"
          data-parity="lightbox-next"
          onClick={onNext}
          size="icon-md"
          type="button"
          variant="outline"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      )}
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
            {label} ·{' '}
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
