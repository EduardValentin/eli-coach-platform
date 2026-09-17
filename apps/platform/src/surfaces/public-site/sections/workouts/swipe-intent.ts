export function resolveSwipeIntent(
  delta: { dx: number; dy: number },
  threshold: number,
): "horizontal" | "undecided" | "vertical" {
  const { dx, dy } = delta;

  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
    return "undecided";
  }

  return Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
}
