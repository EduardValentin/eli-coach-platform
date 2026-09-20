import { useId, type ChangeEvent } from 'react';
import { PROGRESS_PHOTO_CONSENT_COPY } from '../../../domain/onboardingCopy';
import { Checkbox } from '../../ui/checkbox';

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

type ProgressPhotoConsentProps = {
  consented: boolean;
  photos: ProgressPhotos;
  onConsentChange: (consented: boolean) => void;
  onPhotosChange: (photos: ProgressPhotos) => void;
};

export function ProgressPhotoConsent({
  consented,
  photos,
  onConsentChange,
  onPhotosChange,
}: ProgressPhotoConsentProps) {
  const checkboxId = useId();
  const groupId = useId();

  const pick = (view: ProgressPhotoView) => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    onPhotosChange({ ...photos, [view]: URL.createObjectURL(file) });
  };

  return (
    <div className="grid gap-4 rounded-card border border-neutral-100 bg-surface-quiet/60 p-4">
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

      {consented && (
        <div aria-labelledby={groupId} className="grid gap-4 sm:grid-cols-3" role="group">
          <p className="sr-only" id={groupId}>
            Progress photos
          </p>
          {VIEWS.map((view) => (
            <div className="grid gap-2" key={view}>
              <label className="text-sm text-text-label" htmlFor={`${checkboxId}-${view}`}>
                {VIEW_LABELS[view]}
              </label>
              <input
                accept="image/*"
                className="text-sm text-text-secondary file:mr-3 file:rounded-control file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-text-primary"
                id={`${checkboxId}-${view}`}
                onChange={pick(view)}
                type="file"
              />
              {photos[view] && (
                <img
                  alt={`${VIEW_LABELS[view]} progress photo preview`}
                  className="h-28 w-full rounded-card object-cover"
                  src={photos[view] ?? undefined}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
