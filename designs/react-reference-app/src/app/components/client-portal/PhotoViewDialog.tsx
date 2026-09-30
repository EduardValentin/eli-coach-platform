import { useState } from 'react';
import {
  PROGRESS_PHOTO_VIEWS,
  type MeasurementEntry,
  type ProgressPhotoView,
} from '../../domain/journey';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useReturnFocusToOpener } from '../ui/use-return-focus-to-opener';

export type PhotoViewer =
  | { role: 'client'; onRemovePhoto: (view: ProgressPhotoView) => void }
  | { role: 'coach'; clientFirstName: string };

const VIEW_LABELS: Record<ProgressPhotoView, string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
};

const PHOTO_FRAME_CLASS = 'aspect-3/4 w-full rounded-card';

function privacyLine(viewer: PhotoViewer): string {
  return viewer.role === 'client'
    ? 'Only you and your coach can see these photos.'
    : `Only you and ${viewer.clientFirstName} can see these photos.`;
}

function PhotoSlot({
  entry,
  view,
  onRemove,
}: {
  entry: MeasurementEntry;
  view: ProgressPhotoView;
  onRemove?: () => void;
}) {
  const photo = entry.photos[view];
  const label = VIEW_LABELS[view];

  return (
    <li data-parity={`photo-${view}`}>
      <figure className="grid gap-2">
        {photo ? (
          <img
            alt={`${label} photo`}
            className={`${PHOTO_FRAME_CLASS} object-cover`}
            src={photo.url}
          />
        ) : (
          <div
            className={`${PHOTO_FRAME_CLASS} flex items-center justify-center border border-dashed border-control-border-soft p-2 text-center text-sm text-text-secondary`}
          >
            No {view} photo
          </div>
        )}
        <figcaption className="flex min-h-(--size-control-sm) items-center justify-between gap-2">
          <span className="text-sm font-medium text-text-primary">{label}</span>
          {photo && onRemove && (
            <Button
              aria-label={`Remove ${view} photo`}
              data-parity={`remove-${view}`}
              onClick={onRemove}
              size="sm"
              type="button"
              variant="outline"
            >
              Remove
            </Button>
          )}
        </figcaption>
      </figure>
    </li>
  );
}

export function PhotoViewDialog({
  entry,
  viewer,
  onClose,
}: {
  entry: MeasurementEntry | undefined;
  viewer: PhotoViewer;
  onClose: () => void;
}) {
  const [pendingRemoval, setPendingRemoval] =
    useState<ProgressPhotoView | null>(null);
  const focusReturn = useReturnFocusToOpener();

  const removeFor = (view: ProgressPhotoView) =>
    viewer.role === 'client' ? () => setPendingRemoval(view) : undefined;

  const confirmRemoval = () => {
    if (pendingRemoval && viewer.role === 'client') {
      viewer.onRemovePhoto(pendingRemoval);
    }
    setPendingRemoval(null);
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={entry !== undefined}
    >
      {entry && (
        <DialogContent
          data-parity-root="PhotoViewDialog"
          size="wide"
          {...focusReturn}
        >
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>
              Photos from {formatJourneyDate(entry.recordedAt)}
            </DialogTitle>
            <DialogDescription>{privacyLine(viewer)}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {PROGRESS_PHOTO_VIEWS.map((view) => (
                <PhotoSlot
                  entry={entry}
                  key={view}
                  onRemove={removeFor(view)}
                  view={view}
                />
              ))}
            </ul>
          </div>

          <DialogFooter className="border-t border-border/50 px-6 py-4">
            <DialogClose asChild>
              <Button size="sm" type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>

          <ConfirmDialog
            cancelLabel="Keep"
            confirmLabel="Remove"
            description="It is deleted for you and your coach. Your measurements stay."
            onConfirm={confirmRemoval}
            onOpenChange={(open) => {
              if (!open) setPendingRemoval(null);
            }}
            open={pendingRemoval !== null}
            title="Remove this photo?"
            tone="destructive"
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
