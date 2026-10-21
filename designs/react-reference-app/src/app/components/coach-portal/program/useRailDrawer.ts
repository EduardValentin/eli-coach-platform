import { useEffect, useRef, useState } from 'react';
import { useIsDesktop } from '../../ui/use-desktop';
import { wrapTabWithin } from '../../../utils/focusTrap';

export function useRailDrawer() {
  const [open, setOpen] = useState(false);
  const toggled = useRef(false);
  const openButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const aside = useRef<HTMLElement>(null);
  const isDesktop = useIsDesktop();
  const isDrawer = open && !isDesktop;

  function show() {
    toggled.current = true;
    setOpen(true);
  }

  function hide() {
    toggled.current = true;
    setOpen(false);
  }

  useEffect(() => {
    if (!toggled.current) return;
    (open ? closeButton : openButton).current?.focus();
  }, [open]);

  useEffect(() => {
    if (!isDrawer) return;
    const keepKeyboardInRail = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
      if (event.key === 'Tab') wrapTabWithin(aside.current, event);
    };
    document.addEventListener('keydown', keepKeyboardInRail);
    return () => document.removeEventListener('keydown', keepKeyboardInRail);
  }, [isDrawer]);

  return { open, show, hide, openButton, closeButton, aside };
}
