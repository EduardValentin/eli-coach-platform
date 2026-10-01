import {
  PROGRESS_PHOTO_VIEWS,
  type ProgressPhotoView,
} from "@eli-coach-platform/domain/client-profile";
import type { z } from "zod";

import {
  PROGRESS_PHOTO_PARTS,
  type progressPhotoOutcomesSchema,
} from "~/features/client-profile/contracts/progress-photo-parts";

export type ProgressPhotoPicks = Partial<Record<ProgressPhotoView, File>>;

type ProgressPhotoOutcomes = z.infer<typeof progressPhotoOutcomesSchema>;

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
  outcomes: ProgressPhotoOutcomes,
): ProgressPhotoView[] {
  return PROGRESS_PHOTO_VIEWS.filter((view) => outcomes[view] === "refused");
}
