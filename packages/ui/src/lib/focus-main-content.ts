import { MAIN_CONTENT_ID } from "./constants";

export function focusMainContent(): void {
  document.getElementById(MAIN_CONTENT_ID)?.focus({ preventScroll: true });
}
