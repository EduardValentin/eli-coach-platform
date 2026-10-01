import {
  PROGRESS_PHOTO_VIEWS,
  type ProgressPhotoView,
} from "@eli-coach-platform/domain/client-profile";
import {
  PROGRESS_PHOTO_PARTS,
  type PresentedProgressPhotoOutcomes,
} from "~/features/client-profile/contracts/progress-photo-parts";

export type ProgressPhotoPicks = Partial<Record<ProgressPhotoView, File>>;

export function appendProgressPhotoParts(
  formData: FormData,
  photos: ProgressPhotoPicks,
): void {
  for (const view of PROGRESS_PHOTO_VIEWS) {
    const photo = photos[view];
    if (photo) formData.append(PROGRESS_PHOTO_PARTS[view], photo);
  }
}

export function refusedPhotoViewsOf(
  outcomes: PresentedProgressPhotoOutcomes,
): ProgressPhotoView[] {
  return PROGRESS_PHOTO_VIEWS.filter((view) => outcomes[view] === "refused");
}
