import type { ProgressPhotoView } from "@eli-coach-platform/domain/client-profile";
import { z } from "zod";

import { progressPhotoViewSchema } from "~/features/client-profile/contracts/progress-photo-parts";

const refusedPhotosStateSchema = z.object({
  refusedPhotoViews: z.array(progressPhotoViewSchema),
});

type RefusedPhotosState = z.infer<typeof refusedPhotosStateSchema>;

export function refusedPhotosState(
  refusedPhotoViews: ProgressPhotoView[],
): RefusedPhotosState {
  return { refusedPhotoViews };
}

export function refusedPhotoViewsIn(state: unknown): ProgressPhotoView[] {
  const parsed = refusedPhotosStateSchema.safeParse(state);

  return parsed.success ? parsed.data.refusedPhotoViews : [];
}
