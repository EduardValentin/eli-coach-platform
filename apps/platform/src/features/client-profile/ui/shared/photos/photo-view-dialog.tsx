import {
  PROGRESS_PHOTO_VIEWS,
  type ProgressPhotoView,
} from "@eli-coach-platform/domain/client-profile";
import {
  cn,
  formatDayMonth,
  useCalendarDayTimeZone,
} from "@eli-coach-platform/ui/lib";
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  Lightbox,
  type LightboxPhoto,
} from "@eli-coach-platform/ui/overlays";
import { Button } from "@eli-coach-platform/ui/primitives";
import { useState } from "react";

import {
  MEASUREMENTS_COPY,
  type MeasurementRow,
} from "~/features/client-profile/public/measurements";
import {
  progressPhotoImageClass,
  progressPhotoPlaceholderClass,
} from "~/features/client-profile/ui/shared/photos/progress-photo-frame";
import { progressPhotoUrl } from "~/features/client-profile/ui/shared/photos/progress-photo-url";

type MeasurementPhoto = MeasurementRow["photos"][number];

type PhotoViewer =
  | {
      role: "client";
      onRemovePhoto: (photo: MeasurementPhoto) => Promise<void> | void;
    }
  | { role: "coach"; clientFirstName: string };

type PhotoViewDialogProps = {
  entry: MeasurementRow | undefined;
  viewer: PhotoViewer;
  onClose: () => void;
};

const {
  lightbox: LIGHTBOX_COPY,
  photos: PHOTOS_COPY,
  photoView: PHOTO_VIEW_COPY,
} = MEASUREMENTS_COPY;

function privacyLine(viewer: PhotoViewer): string {
  return viewer.role === "client"
    ? PHOTO_VIEW_COPY.clientDescription
    : PHOTO_VIEW_COPY.coachDescription(viewer.clientFirstName);
}

function photoOf(
  entry: MeasurementRow,
  view: ProgressPhotoView,
): MeasurementPhoto | undefined {
  return entry.photos.find((candidate) => candidate.view === view);
}

function lightboxPhotosOf(entry: MeasurementRow): LightboxPhoto[] {
  return PROGRESS_PHOTO_VIEWS.flatMap((view) => {
    const photo = photoOf(entry, view);

    return photo
      ? [
          {
            alt: PHOTOS_COPY.image(view),
            key: view,
            label: PHOTOS_COPY.viewLabels[view],
            src: progressPhotoUrl(photo.id),
          },
        ]
      : [];
  });
}

function PhotoSlot({
  onOpen,
  onRemove,
  photo,
  view,
}: {
  onOpen: () => void;
  onRemove?: () => void;
  photo: MeasurementPhoto | undefined;
  view: ProgressPhotoView;
}) {
  return (
    <li data-parity={`photo-${view}`}>
      <figure className="grid gap-2">
        {photo ? (
          <button
            aria-label={LIGHTBOX_COPY.open(view)}
            className="block w-full cursor-zoom-in rounded-card transition-opacity hover:opacity-90"
            data-parity={`open-${view}`}
            onClick={onOpen}
            type="button"
          >
            <img
              alt={PHOTOS_COPY.image(view)}
              className={progressPhotoImageClass("portrait")}
              src={progressPhotoUrl(photo.id)}
            />
          </button>
        ) : (
          <div
            className={cn(
              progressPhotoPlaceholderClass("portrait"),
              "text-sm text-text-secondary",
            )}
          >
            {PHOTO_VIEW_COPY.missing(view)}
          </div>
        )}
        <figcaption className="flex min-h-(--size-control-sm) items-center justify-between gap-2">
          <span className="text-sm font-medium text-text-primary">
            {PHOTOS_COPY.viewLabels[view]}
          </span>
          {photo && onRemove && (
            <Button
              aria-label={PHOTOS_COPY.removeView(view)}
              data-parity={`remove-${view}`}
              onClick={onRemove}
              size="sm"
              type="button"
              variant="outline"
            >
              {PHOTO_VIEW_COPY.remove}
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
}: PhotoViewDialogProps) {
  const timeZone = useCalendarDayTimeZone();
  const [pendingRemoval, setPendingRemoval] = useState<MeasurementPhoto | null>(
    null,
  );
  const [fullScreenView, setFullScreenView] = useState<string | null>(null);

  const removeFor = (photo: MeasurementPhoto | undefined) =>
    viewer.role === "client" && photo
      ? () => setPendingRemoval(photo)
      : undefined;

  const confirmRemoval = async () => {
    if (pendingRemoval && viewer.role === "client") {
      await viewer.onRemovePhoto(pendingRemoval);
    }
    setPendingRemoval(null);
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) return;
        setFullScreenView(null);
        onClose();
      }}
      open={entry !== undefined}
    >
      {entry && (
        <DialogContent
          data-parity-root="PhotoViewDialog"
          description={privacyLine(viewer)}
          descriptionParity="photo-view-description"
          footer={
            <Button
              data-parity="photo-view-close"
              onClick={onClose}
              size="sm"
              type="button"
              variant="outline"
            >
              {PHOTO_VIEW_COPY.close}
            </Button>
          }
          footerAlignment="end"
          footerParity="photo-view-footer"
          size="wide"
          title={PHOTO_VIEW_COPY.title(
            formatDayMonth(entry.recordedAt, timeZone),
          )}
        >
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PROGRESS_PHOTO_VIEWS.map((view) => {
              const photo = photoOf(entry, view);

              return (
                <PhotoSlot
                  key={view}
                  onOpen={() => setFullScreenView(view)}
                  onRemove={removeFor(photo)}
                  photo={photo}
                  view={view}
                />
              );
            })}
          </ul>

          <Lightbox
            currentKey={fullScreenView}
            description={formatDayMonth(entry.recordedAt, timeZone)}
            labels={LIGHTBOX_COPY}
            onCurrentKeyChange={setFullScreenView}
            photos={lightboxPhotosOf(entry)}
          />

          <ConfirmDialog
            cancelLabel={MEASUREMENTS_COPY.removeConfirm.cancel}
            confirmLabel={MEASUREMENTS_COPY.removeConfirm.confirm}
            description={MEASUREMENTS_COPY.removeConfirm.description}
            onConfirm={() => void confirmRemoval()}
            onOpenChange={(open) => {
              if (!open) setPendingRemoval(null);
            }}
            open={pendingRemoval !== null}
            title={MEASUREMENTS_COPY.removeConfirm.title}
            tone="destructive"
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
