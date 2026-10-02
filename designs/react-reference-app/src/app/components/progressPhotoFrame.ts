import { cn } from './ui/utils';

export type ProgressPhotoFrameShape = 'square' | 'portrait';

const SHAPE_CLASS: Record<ProgressPhotoFrameShape, string> = {
  square: 'aspect-square',
  portrait: 'aspect-3/4',
};

export function progressPhotoImageClass(shape: ProgressPhotoFrameShape): string {
  return cn(SHAPE_CLASS[shape], 'w-full rounded-card object-cover');
}

export function progressPhotoPlaceholderClass(
  shape: ProgressPhotoFrameShape,
): string {
  return cn(
    SHAPE_CLASS[shape],
    'flex w-full flex-col items-center justify-center gap-1 rounded-card border border-dashed border-control-border-soft p-2 text-center',
  );
}
