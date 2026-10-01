import { useId, useState, type ChangeEvent } from 'react';
import { format } from 'date-fns';
import { Image as ImageIcon, X } from 'lucide-react';
import {
  NO_PROGRESS_PHOTOS,
  PROGRESS_PHOTO_VIEW_LABELS,
  PROGRESS_PHOTO_VIEWS,
  withoutPhotoAt,
  withPhotoAt,
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
import {
  progressPhotoImageClass,
  progressPhotoPlaceholderClass,
} from '../../progressPhotoFrame';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { cn } from '../../ui/utils';

export type ProgressPhotoConsent =
  | { status: 'recorded'; at: Date }
  | {
      status: 'asking';
      ticked: boolean;
      onTickedChange: (ticked: boolean) => void;
    };

const LOCKED_NOTE = 'Tick the box to add your photos.';

const REFUSED_PHOTO_MESSAGE = 'Choose a JPEG, PNG or WebP under 10 MB.';

type ProgressPhotoBlockProps = {
  consent: ProgressPhotoConsent;
  photos: ProgressPhotoSet;
  onPhotosChange: (photos: ProgressPhotoSet) => void;
  sendNote?: string;
};

function consentedLine(consentedAt: Date): string {
  return `You agreed to share progress photos on ${format(consentedAt, 'd MMMM yyyy')}.`;
}

function locksPhotos(consent: ProgressPhotoConsent): boolean {
  return consent.status === 'asking' && !consent.ticked;
}

function PhotoTile({
  view,
  photo,
  locked,
  onPick,
  onRemove,
  onRefuse,
}: {
  view: ProgressPhotoView;
  photo: ProgressPhoto | undefined;
  locked: boolean;
  onPick: (photo: ProgressPhoto) => void;
  onRemove: () => void;
  onRefuse: () => void;
}) {
  const label = PROGRESS_PHOTO_VIEW_LABELS[view];

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
          alt={`${label} photo`}
          className={progressPhotoImageClass('square')}
          src={photo.url}
        />
        <Button
          aria-label={`Remove ${view} photo`}
          className="absolute top-1 right-1 size-8 bg-surface-base shadow-card hover:bg-surface-muted"
          onClick={onRemove}
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
        progressPhotoPlaceholderClass('square'),
        'relative transition-colors',
        {
          'cursor-not-allowed opacity-60': locked,
          'cursor-pointer hover:border-primary hover:bg-primary-soft/40':
            !locked,
        },
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
      <span className="text-sm font-medium text-text-primary">{label}</span>{' '}
      <span className="text-xs text-text-secondary">Add photo</span>
    </label>
  );
}

function ConsentCheckbox({
  ticked,
  onTickedChange,
}: {
  ticked: boolean;
  onTickedChange: (ticked: boolean) => void;
}) {
  const checkboxId = useId();

  return (
    <div className="flex items-start gap-3">
      <Checkbox
        checked={ticked}
        className="mt-0.5"
        data-parity="progress-photos-checkbox"
        id={checkboxId}
        onCheckedChange={(checked) => onTickedChange(checked === true)}
      />
      <label
        className="text-sm leading-relaxed text-text-primary"
        htmlFor={checkboxId}
      >
        {PROGRESS_PHOTO_CONSENT_COPY}
      </label>
    </div>
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
  const [refused, setRefused] = useState(false);
  const locked = locksPhotos(consent);

  const pick = (view: ProgressPhotoView, photo: ProgressPhoto) => {
    setRefused(false);
    onPhotosChange(withPhotoAt(photos, view, photo));
  };

  const remove = (view: ProgressPhotoView) => {
    setRefused(false);
    onPhotosChange(withoutPhotoAt(photos, view));
  };

  const clearPicks = () => {
    setRefused(false);
    onPhotosChange(NO_PROGRESS_PHOTOS);
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

      {consent.status === 'recorded' ? (
        <p
          className="text-sm leading-relaxed text-text-secondary"
          data-parity="progress-photos-consented"
        >
          {consentedLine(consent.at)}
        </p>
      ) : (
        <ConsentCheckbox
          onTickedChange={(ticked) => {
            if (!ticked) clearPicks();
            consent.onTickedChange(ticked);
          }}
          ticked={consent.ticked}
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
          Progress photos
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

      {!locked && sendNote && (
        <p
          className="text-xs text-text-secondary"
          data-parity="progress-photos-send-note"
        >
          {sendNote}
        </p>
      )}
    </div>
  );
}
