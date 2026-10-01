import { useRef, type PointerEvent } from 'react';

const SWIPE_DISTANCE_PX = 40;
const TAP_TOLERANCE_PX = 10;
const DOUBLE_TAP_WINDOW_MS = 300;

type PointerStart = { pointerId: number; x: number; y: number };

type PhotoGestureHandlers = {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onDoubleTap: (event: PointerEvent<HTMLElement>) => void;
};

function isSwipe(dx: number, dy: number): boolean {
  return Math.abs(dx) >= SWIPE_DISTANCE_PX && Math.abs(dx) > Math.abs(dy);
}

function isTap(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) <= TAP_TOLERANCE_PX;
}

export function usePhotoGestures({
  onSwipeLeft,
  onSwipeRight,
  onDoubleTap,
}: PhotoGestureHandlers) {
  const start = useRef<PointerStart | null>(null);
  const lastTapAt = useRef<number | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    start.current = start.current
      ? null
      : { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const from = start.current;
    start.current = null;
    if (from?.pointerId !== event.pointerId) return;

    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;

    if (isSwipe(dx, dy)) {
      lastTapAt.current = null;
      if (dx < 0) onSwipeLeft();
      else onSwipeRight();
      return;
    }

    if (!isTap(dx, dy)) return;

    const previousTapAt = lastTapAt.current;
    if (
      previousTapAt !== null &&
      event.timeStamp - previousTapAt <= DOUBLE_TAP_WINDOW_MS
    ) {
      lastTapAt.current = null;
      onDoubleTap(event);
      return;
    }

    lastTapAt.current = event.timeStamp;
  };

  const onPointerCancel = () => {
    start.current = null;
  };

  return { onPointerDown, onPointerUp, onPointerCancel };
}
