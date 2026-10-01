import {
  PROGRESS_PHOTO_VIEWS,
  type ProgressPhotoOutcomes,
  type ProgressPhotoView,
  type ReceivedProgressPhoto,
} from "@eli-coach-platform/domain/client-profile";
import { z } from "zod";

export const PROGRESS_PHOTO_PARTS = {
  front: "front",
  side: "side",
  back: "back",
} as const satisfies Record<ProgressPhotoView, string>;

export const progressPhotoViewSchema = z.enum(PROGRESS_PHOTO_VIEWS);

export const progressPhotoOutcomesSchema = z.record(
  progressPhotoViewSchema,
  z.enum(["stored", "refused", "absent"]),
);

type PresentedProgressPhotoOutcomes = z.infer<
  typeof progressPhotoOutcomesSchema
>;

export function progressPhotoOutcomesOf(
  outcomes: ProgressPhotoOutcomes,
): PresentedProgressPhotoOutcomes {
  return progressPhotoOutcomesSchema.parse(
    Object.fromEntries(
      PROGRESS_PHOTO_VIEWS.map((view) => [view, outcomes[view] ?? "absent"]),
    ),
  );
}

export async function receivedProgressPhotosOf(
  formData: FormData,
): Promise<ReceivedProgressPhoto[]> {
  const photos: ReceivedProgressPhoto[] = [];

  for (const view of PROGRESS_PHOTO_VIEWS) {
    const part = formData.get(PROGRESS_PHOTO_PARTS[view]);

    if (part instanceof File) {
      photos.push({
        view,
        mimeType: part.type,
        sizeBytes: part.size,
        bytes: new Uint8Array(await part.arrayBuffer()),
      });
    }
  }

  return photos;
}
