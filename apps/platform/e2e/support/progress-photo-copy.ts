import type { ProgressPhotoView } from "@eli-coach-platform/domain/client-profile";

const VIEW_LABELS: Record<ProgressPhotoView, string> = {
  front: "Front",
  side: "Side",
  back: "Back",
};

export function photoNameOf(view: ProgressPhotoView): string {
  return `${VIEW_LABELS[view]} photo`;
}
