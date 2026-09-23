import { useId, type ChangeEvent } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { PROGRESS_PHOTO_CONSENT_COPY } from '../../../domain/onboardingCopy';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { cn } from '../../ui/utils';

export type ProgressPhotoView = 'front' | 'side' | 'back';

export type ProgressPhotos = Record<ProgressPhotoView, string | null>;

export const EMPTY_PROGRESS_PHOTOS: ProgressPhotos = {
  front: null,
  side: null,
  back: null,
};

const VIEW_LABELS: Record<ProgressPhotoView, string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
};

const VIEWS: readonly ProgressPhotoView[] = ['front', 'side', 'back'];

const LOCKED_NOTE = 'Tick the box to add your photos.';

const TILE_CLASS =
  'relative flex aspect-square flex-col items-center justify-center gap-1 rounded-card border border-dashed border-control-border-soft p-2 text-center transition-colors';

type ProgressPhotoBlockProps = {
  consented: boolean;
  photos: ProgressPhotos;
  onConsentChange: (consented: boolean) => void;
  onPhotosChange: (photos: ProgressPhotos) => void;
};

function PhotoTile({
  view,
  photo,
  locked,
  onPick,
}: {
  view: ProgressPhotoView;
  photo: string | null;
  locked: boolean;
  onPick: (photo: string | null) => void;
}) {
  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onPick(URL.createObjectURL(file));
  };

  if (photo) {
    return (
      <div className="relative">
        <img
          alt={`${VIEW_LABELS[view]} photo`}
          className="aspect-square w-full rounded-card object-cover"
          src={photo}
        />
        <Button
          aria-label={`Remove ${VIEW_LABELS[view].toLowerCase()} photo`}
          className="absolute top-1 right-1 size-8 bg-surface-base shadow-card hover:bg-surface-muted"
          onClick={() => onPick(null)}
          size="icon"
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
        accept="image/*"
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
  consented,
  photos,
  onConsentChange,
  onPhotosChange,
}: ProgressPhotoBlockProps) {
  const checkboxId = useId();
  const groupId = useId();
  const noteId = useId();

  return (
    <div className="grid gap-4 rounded-card border border-border-subtle bg-surface-quiet/60 p-4">
      <p className="text-sm font-medium text-text-label">
        Progress photos <span className="font-normal text-text-secondary">(optional)</span>
      </p>

      <div className="flex items-start gap-3">
        <Checkbox
          checked={consented}
          className="mt-0.5"
          id={checkboxId}
          onCheckedChange={(checked) => onConsentChange(checked === true)}
        />
        <label className="text-sm leading-relaxed text-text-primary" htmlFor={checkboxId}>
          {PROGRESS_PHOTO_CONSENT_COPY}
        </label>
      </div>

      <div
        aria-describedby={consented ? undefined : noteId}
        aria-labelledby={groupId}
        className="grid grid-cols-3 gap-2 sm:gap-4"
        role="group"
      >
        <p className="sr-only" id={groupId}>
          Progress photos
        </p>
        {VIEWS.map((view) => (
          <PhotoTile
            key={view}
            locked={!consented}
            onPick={(photo) => onPhotosChange({ ...photos, [view]: photo })}
            photo={photos[view]}
            view={view}
          />
        ))}
      </div>

      {!consented && (
        <p className="text-xs text-text-secondary" id={noteId}>
          {LOCKED_NOTE}
        </p>
      )}
    </div>
  );
}
