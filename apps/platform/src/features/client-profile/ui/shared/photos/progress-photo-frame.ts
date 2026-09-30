import { cn } from "@eli-coach-platform/ui/lib";

type ProgressPhotoFrameShape = "square" | "portrait";

const SHAPE_CLASS = {
  square: "aspect-square",
  portrait: "aspect-3/4",
} as const satisfies Record<ProgressPhotoFrameShape, string>;

export function progressPhotoImageClass(shape: ProgressPhotoFrameShape) {
  return cn(SHAPE_CLASS[shape], "w-full rounded-card object-cover");
}

export function progressPhotoPlaceholderClass(shape: ProgressPhotoFrameShape) {
  return cn(
    SHAPE_CLASS[shape],
    "flex w-full flex-col items-center justify-center gap-1 rounded-card border border-dashed border-control-border-soft p-2 text-center",
  );
}
