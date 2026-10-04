import { useState, type PointerEvent } from 'react';
import { cn } from './ui/utils';
import { usePhotoGestures } from './usePhotoGestures';

type Zoom = { scale: 1 } | { scale: 2; origin: string };

const FITTED: Zoom = { scale: 1 };

function originUnder(event: PointerEvent<HTMLElement>, image: HTMLElement) {
  const frame = image.getBoundingClientRect();
  if (frame.width === 0 || frame.height === 0) return 'center';

  const percentAlong = (offset: number, length: number) =>
    Math.min(100, Math.max(0, (offset / length) * 100));

  return `${percentAlong(event.clientX - frame.left, frame.width)}% ${percentAlong(event.clientY - frame.top, frame.height)}%`;
}

export function ZoomableImage({
  src,
  alt,
  onSwipeLeft,
  onSwipeRight,
  className,
  imageClassName,
  parity,
}: {
  src: string;
  alt: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  className?: string;
  imageClassName?: string;
  parity: { stage: string; image: string };
}) {
  const [zoom, setZoom] = useState<Zoom>(FITTED);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  const toggleZoom = (event: PointerEvent<HTMLElement>) => {
    setZoom((current) =>
      current.scale === 1 && image
        ? { scale: 2, origin: originUnder(event, image) }
        : FITTED,
    );
  };

  const gestures = usePhotoGestures({
    onSwipeLeft,
    onSwipeRight,
    onDoubleTap: toggleZoom,
  });

  return (
    <div
      className={cn(
        'flex min-w-0 touch-pinch-zoom items-center justify-center overflow-hidden select-none',
        className,
      )}
      data-parity={parity.stage}
      {...gestures}
    >
      <img
        alt={alt}
        className={cn(
          'max-h-full max-w-full object-contain transition-transform duration-200 motion-reduce:transition-none',
          {
            'cursor-zoom-in': zoom.scale === 1,
            'cursor-zoom-out': zoom.scale === 2,
          },
          imageClassName,
        )}
        data-parity={parity.image}
        draggable={false}
        ref={setImage}
        src={src}
        style={{
          transform: `scale(${zoom.scale})`,
          transformOrigin: zoom.scale === 2 ? zoom.origin : 'center',
        }}
      />
    </div>
  );
}
