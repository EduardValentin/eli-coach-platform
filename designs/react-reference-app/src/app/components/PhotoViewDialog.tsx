import { useState } from 'react';
import {
  PROGRESS_PHOTO_VIEW_LABELS,
  PROGRESS_PHOTO_VIEWS,
  type MeasurementEntry,
  type ProgressPhotoView,
} from '../domain/journey';
import { formatJourneyDate } from '../utils/journeyLabels';
import {
  progressPhotoImageClass,
  progressPhotoPlaceholderClass,
} from './progressPhotoFrame';
import { Button } from './ui/button';
import { ConfirmDialog } from './ui/confirm-dialog';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { cn } from './ui/utils';

export type PhotoViewer =
  | { role: 'client'; onRemovePhoto: (view: ProgressPhotoView) => void }
  | { role: 'coach'; clientFirstName: string };

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
  const label = PROGRESS_PHOTO_VIEW_LABELS[view];

  return (
    <li data-parity={`photo-${view}`}>
      <figure className="grid gap-2">
        {photo ? (
          <img
            alt={`${label} photo`}
            className={progressPhotoImageClass('portrait')}
            src={photo.url}
          />
        ) : (
          <div
            className={cn(
              progressPhotoPlaceholderClass('portrait'),
              'text-sm text-text-secondary',
            )}
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
        <DialogContent data-parity-root="PhotoViewDialog" size="wide">
          <DialogHeader>
            <DialogTitle>
              Photos from {formatJourneyDate(entry.recordedAt)}
            </DialogTitle>
            <DialogDescription>{privacyLine(viewer)}</DialogDescription>
          </DialogHeader>

          <DialogBody>
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
          </DialogBody>

          <DialogFooter className="flex justify-end">
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
