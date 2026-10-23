import { useEffect, type RefObject } from 'react';
import { wrapTabWithin } from '../../../utils/focusTrap';

export function useDrawerKeyboard(drawer: RefObject<HTMLElement | null> | null, onEscape: () => void) {
  useEffect(() => {
    if (!drawer) return;
    const keepKeyboardInDrawer = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onEscape();
      if (event.key === 'Tab') wrapTabWithin(drawer.current, event);
    };
    document.addEventListener('keydown', keepKeyboardInDrawer);
    return () => document.removeEventListener('keydown', keepKeyboardInDrawer);
  }, [drawer, onEscape]);
}
