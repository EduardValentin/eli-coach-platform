export function resolveFocusTrapTarget(input: {
  active: HTMLElement | null;
  reachable: readonly HTMLElement[];
  shiftKey: boolean;
}): HTMLElement | null {
  const { active, reachable, shiftKey } = input;

  if (reachable.length === 0) {
    return null;
  }

  const first = reachable[0]!;
  const last = reachable[reachable.length - 1]!;

  if (shiftKey && (active === first || active === null || !reachable.includes(active))) {
    return last;
  }

  if (!shiftKey && active === last) {
    return first;
  }

  return null;
}
