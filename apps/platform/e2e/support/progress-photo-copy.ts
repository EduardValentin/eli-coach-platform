import type { ProgressPhotoView } from "@eli-coach-platform/domain/client-profile";

const VIEW_LABELS: Record<ProgressPhotoView, string> = {
  front: "Front",
  side: "Side",
  back: "Back",
};

export function photoNameOf(view: ProgressPhotoView): string {
  return `${VIEW_LABELS[view]} photo`;
}

export function refusedPhotoToastOf(view: ProgressPhotoView): string {
  return `The ${view} photo could not be processed, so it was not saved.`;
}

export const REFUSED_PHOTO_TOAST = /photo could not be processed/;
