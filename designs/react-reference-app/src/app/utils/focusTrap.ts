const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function wrapTabWithin(container: HTMLElement | null, event: KeyboardEvent) {
  const controls = [...(container?.querySelectorAll<HTMLElement>(TABBABLE) ?? [])];
  const first = controls[0];
  const last = controls.at(-1);
  if (!container || !first || !last) return;

  const focused = document.activeElement;
  const outside = !container.contains(focused);
  if (event.shiftKey && (outside || focused === first)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (outside || focused === last)) {
    event.preventDefault();
    first.focus();
  }
}
