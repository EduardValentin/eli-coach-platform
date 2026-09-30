import { useId, useState, type ChangeEvent } from 'react';
import { format } from 'date-fns';
import { Image as ImageIcon, X } from 'lucide-react';
import {
  PROGRESS_PHOTO_VIEWS,
  type ProgressPhoto,
  type ProgressPhotoSet,
  type ProgressPhotoView,
} from '../../../domain/journey';
import {
  isAcceptedProgressPhoto,
  PROGRESS_PHOTO_TYPES,
} from '../../../domain/measurements';
import { PROGRESS_PHOTO_CONSENT_COPY } from '../../../domain/onboardingCopy';
import { FIELD_ERROR_CLASS } from '../../../utils/formFieldStyles';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { cn } from '../../ui/utils';

const VIEW_LABELS: Record<ProgressPhotoView, string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
};

const LOCKED_NOTE = 'Tick the box to add your photos.';

const REFUSED_PHOTO_MESSAGE = 'Choose a JPEG, PNG or WebP under 10 MB.';

const TILE_CLASS =
  'relative flex aspect-square flex-col items-center justify-center gap-1 rounded-card border border-dashed border-control-border-soft p-2 text-center transition-colors';

type ProgressPhotoBlockProps = {
  consentedAt: Date | null;
  consented: boolean;
  photos: ProgressPhotoSet;
  onConsentChange: (consented: boolean) => void;
  onPhotosChange: (photos: ProgressPhotoSet) => void;
};

function consentedLine(consentedAt: Date): string {
  return `You agreed to share progress photos on ${format(consentedAt, 'd MMMM yyyy')}.`;
}

function withPhoto(
  photos: ProgressPhotoSet,
  view: ProgressPhotoView,
  photo: ProgressPhoto | null,
): ProgressPhotoSet {
  const next = { ...photos };
  if (photo) next[view] = photo;
  else delete next[view];

  return next;
}

function PhotoTile({
  view,
  photo,
  locked,
  onPick,
  onRefuse,
}: {
  view: ProgressPhotoView;
  photo: ProgressPhoto | undefined;
  locked: boolean;
  onPick: (photo: ProgressPhoto | null) => void;
  onRefuse: () => void;
}) {
  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isAcceptedProgressPhoto(file)) {
      onRefuse();
      return;
    }

    onPick({ url: URL.createObjectURL(file) });
  };

  if (photo) {
    return (
      <div className="relative">
        <img
          alt={`${VIEW_LABELS[view]} photo`}
          className="aspect-square w-full rounded-card object-cover"
          src={photo.url}
        />
        <Button
          aria-label={`Remove ${view} photo`}
          className="absolute top-1 right-1 size-8 bg-surface-base shadow-card hover:bg-surface-muted"
          onClick={() => onPick(null)}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <label
      data-chip-control=""
      className={cn(
        TILE_CLASS,
        locked
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-pointer hover:border-primary hover:bg-primary-soft/40',
      )}
    >
      <input
        accept={PROGRESS_PHOTO_TYPES.join(',')}
        aria-label={`Add ${view} photo`}
        className="absolute size-px overflow-hidden opacity-0"
        disabled={locked}
        onChange={choose}
        type="file"
      />
      <ImageIcon aria-hidden="true" className="text-icon-muted" size={20} />
      <span className="text-sm font-medium text-text-primary">
        {VIEW_LABELS[view]}
      </span>{' '}
      <span className="text-xs text-text-secondary">Add photo</span>
    </label>
  );
}

export function ProgressPhotoBlock({
  consentedAt,
  consented,
  photos,
  onConsentChange,
  onPhotosChange,
}: ProgressPhotoBlockProps) {
  const checkboxId = useId();
  const groupId = useId();
  const noteId = useId();
  const [refused, setRefused] = useState(false);
  const locked = consentedAt === null && !consented;

  const pick = (view: ProgressPhotoView, photo: ProgressPhoto | null) => {
    setRefused(false);
    onPhotosChange(withPhoto(photos, view, photo));
  };

  return (
    <div
      className="grid gap-4 rounded-card border border-border-subtle bg-surface-quiet/60 p-4"
      data-parity="progress-photos"
    >
      <p
        className="text-sm font-medium text-text-label"
        data-parity="progress-photos-caption"
      >
        Progress photos{' '}
        <span
          className="font-normal text-text-secondary"
          data-parity="progress-photos-suffix"
        >
          (optional)
        </span>
      </p>

      {consentedAt ? (
        <p
          className="text-sm leading-relaxed text-text-secondary"
          data-parity="progress-photos-consented"
        >
          {consentedLine(consentedAt)}
        </p>
      ) : (
        <div className="flex items-start gap-3">
          <Checkbox
            checked={consented}
            className="mt-0.5"
            data-parity="progress-photos-checkbox"
            id={checkboxId}
            onCheckedChange={(checked) => onConsentChange(checked === true)}
          />
          <label
            className="text-sm leading-relaxed text-text-primary"
            htmlFor={checkboxId}
          >
            {PROGRESS_PHOTO_CONSENT_COPY}
          </label>
        </div>
      )}

      <div
        aria-describedby={locked ? noteId : undefined}
        aria-labelledby={groupId}
        className="grid grid-cols-3 gap-2 sm:gap-4"
        data-parity="progress-photos-tiles"
        role="group"
      >
        <p className="sr-only" id={groupId}>
          Progress photos
        </p>
        {PROGRESS_PHOTO_VIEWS.map((view) => (
          <PhotoTile
            key={view}
            locked={locked}
            onPick={(photo) => pick(view, photo)}
            onRefuse={() => setRefused(true)}
            photo={photos[view]}
            view={view}
          />
        ))}
      </div>

      {refused && (
        <p
          className={FIELD_ERROR_CLASS}
          data-parity="progress-photos-error"
          role="alert"
        >
          {REFUSED_PHOTO_MESSAGE}
        </p>
      )}

      {locked && (
        <p
          className="text-xs text-text-secondary"
          data-parity="progress-photos-note"
          id={noteId}
        >
          {LOCKED_NOTE}
        </p>
      )}
    </div>
  );
}
