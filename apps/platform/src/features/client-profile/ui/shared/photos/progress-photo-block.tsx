import {
  ACCEPTED_PROGRESS_PHOTO_TYPES,
  PROGRESS_PHOTO_VIEWS,
  ProgressPhoto,
  type ProgressPhotoView,
} from "@eli-coach-platform/domain/client-profile";
import {
  cn,
  formatDayMonthYear,
  useCalendarDayTimeZone,
} from "@eli-coach-platform/ui/lib";
import {
  Button,
  Card,
  CheckboxField,
  FieldCaption,
  FieldError,
  LabelSuffix,
} from "@eli-coach-platform/ui/primitives";
import { Image as ImageIcon, X } from "lucide-react";
import { useEffect, useId, useState, type ChangeEvent } from "react";

import { MEASUREMENTS_COPY } from "~/features/client-profile/contracts/measurements";
import { PROGRESS_PHOTO_CONSENT_COPY } from "~/features/client-profile/contracts/progress-photo-consent";
import {
  progressPhotoImageClass,
  progressPhotoPlaceholderClass,
} from "~/features/client-profile/ui/shared/photos/progress-photo-frame";
import {
  NO_PROGRESS_PHOTO_PICKS,
  type ProgressPhotoPicks,
} from "~/features/client-profile/ui/shared/photos/progress-photo-picks";

export type ProgressPhotoConsent =
  | { status: "recorded"; at: string }
  | {
      status: "asking";
      ticked: boolean;
      onTickedChange: (ticked: boolean) => void;
    };

type ProgressPhotoBlockProps = {
  consent: ProgressPhotoConsent;
  photos: ProgressPhotoPicks;
  onPhotosChange: (photos: ProgressPhotoPicks) => void;
  sendNote?: string;
};

type PhotoTileProps = {
  view: ProgressPhotoView;
  photo: File | undefined;
  locked: boolean;
  onPick: (photo: File) => void;
  onRemove: () => void;
  onRefuse: () => void;
};

const PHOTOS_COPY = MEASUREMENTS_COPY.photos;

const ACCEPTED_PHOTO_TYPES = ACCEPTED_PROGRESS_PHOTO_TYPES.join(",");

function locksPhotos(consent: ProgressPhotoConsent): boolean {
  return consent.status === "asking" && !consent.ticked;
}

function acceptsPhoto(file: File): boolean {
  return ProgressPhoto.accepts({ mimeType: file.type, sizeBytes: file.size });
}

function usePreviewUrl(photo: File): string | undefined {
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [photo]);

  return previewUrl;
}

function PhotoPreview({
  onRemove,
  photo,
  view,
}: {
  onRemove: () => void;
  photo: File;
  view: ProgressPhotoView;
}) {
  const previewUrl = usePreviewUrl(photo);

  return (
    <div className="relative">
      <img
        alt={PHOTOS_COPY.image(view)}
        className={progressPhotoImageClass("square")}
        src={previewUrl}
      />
      <Button
        aria-label={PHOTOS_COPY.removeView(view)}
        className="absolute top-1 right-1 shadow-card hover:bg-surface-muted"
        onClick={onRemove}
        size="icon-xs"
        type="button"
        variant="outline"
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  );
}

function PhotoTile({
  view,
  photo,
  locked,
  onPick,
  onRemove,
  onRefuse,
}: PhotoTileProps) {
  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!acceptsPhoto(file)) {
      onRefuse();
      return;
    }

    onPick(file);
  };

  if (photo) {
    return <PhotoPreview onRemove={onRemove} photo={photo} view={view} />;
  }

  return (
    <label
      className={cn(
        progressPhotoPlaceholderClass("square"),
        "relative transition-colors",
        {
          "cursor-not-allowed opacity-60": locked,
          "cursor-pointer hover:border-primary hover:bg-primary-soft/40":
            !locked,
        },
      )}
      data-chip-control=""
    >
      <input
        accept={ACCEPTED_PHOTO_TYPES}
        aria-label={PHOTOS_COPY.addView(view)}
        className="absolute size-px overflow-hidden opacity-0"
        disabled={locked}
        onChange={choose}
        type="file"
      />
      <ImageIcon aria-hidden="true" className="text-icon-muted" size={20} />
      <span className="text-sm font-medium text-text-primary">
        {PHOTOS_COPY.viewLabels[view]}
      </span>{" "}
      <span className="text-xs text-text-secondary">
        {PHOTOS_COPY.addPhoto}
      </span>
    </label>
  );
}

function ConsentedLine({ at }: { at: string }) {
  const timeZone = useCalendarDayTimeZone();

  return (
    <p
      className="text-sm leading-relaxed text-text-secondary"
      data-parity="progress-photos-consented"
    >
      {PHOTOS_COPY.consented(formatDayMonthYear(at, timeZone))}
    </p>
  );
}

export function ProgressPhotoBlock({
  consent,
  photos,
  onPhotosChange,
  sendNote,
}: ProgressPhotoBlockProps) {
  const groupId = useId();
  const noteId = useId();
  const errorId = useId();
  const [refused, setRefused] = useState(false);
  const locked = locksPhotos(consent);

  const pick = (view: ProgressPhotoView, photo: File) => {
    setRefused(false);
    onPhotosChange({ ...photos, [view]: photo });
  };

  const remove = (view: ProgressPhotoView) => {
    setRefused(false);
    onPhotosChange({ ...photos, [view]: undefined });
  };

  const changeConsent = (
    ticked: boolean,
    onTickedChange: (ticked: boolean) => void,
  ) => {
    if (!ticked) {
      setRefused(false);
      onPhotosChange(NO_PROGRESS_PHOTO_PICKS);
    }
    onTickedChange(ticked);
  };

  return (
    <Card className="grid gap-4" data-parity="progress-photos" variant="inset">
      <FieldCaption data-parity="progress-photos-caption">
        {PHOTOS_COPY.caption}{" "}
        <LabelSuffix data-parity="progress-photos-suffix">
          {PHOTOS_COPY.optional}
        </LabelSuffix>
      </FieldCaption>

      {consent.status === "recorded" ? (
        <ConsentedLine at={consent.at} />
      ) : (
        <CheckboxField
          checkboxParity="progress-photos-checkbox"
          checked={consent.ticked}
          label={PROGRESS_PHOTO_CONSENT_COPY}
          layout="statement"
          onCheckedChange={(ticked) =>
            changeConsent(ticked, consent.onTickedChange)
          }
        />
      )}

      <div
        aria-describedby={locked ? noteId : undefined}
        aria-labelledby={groupId}
        className="grid grid-cols-3 gap-2 sm:gap-4"
        data-parity="progress-photos-tiles"
        role="group"
      >
        <p className="sr-only" id={groupId}>
          {PHOTOS_COPY.caption}
        </p>
        {PROGRESS_PHOTO_VIEWS.map((view) => (
          <PhotoTile
            key={view}
            locked={locked}
            onPick={(photo) => pick(view, photo)}
            onRefuse={() => setRefused(true)}
            onRemove={() => remove(view)}
            photo={photos[view]}
            view={view}
          />
        ))}
      </div>

      <FieldError
        data-parity="progress-photos-error"
        id={errorId}
        message={refused ? PHOTOS_COPY.refused : undefined}
        role="alert"
      />

      {locked && (
        <p
          className="text-xs text-text-secondary"
          data-parity="progress-photos-note"
          id={noteId}
        >
          {PHOTOS_COPY.locked}
        </p>
      )}

      {!locked && sendNote && (
        <p
          className="text-xs text-text-secondary"
          data-parity="progress-photos-send-note"
        >
          {sendNote}
        </p>
      )}
    </Card>
  );
}
