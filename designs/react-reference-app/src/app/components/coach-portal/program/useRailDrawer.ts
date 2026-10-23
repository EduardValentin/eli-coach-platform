import { useEffect, useRef, useState } from 'react';
import { useIsDesktop } from '../../ui/use-desktop';
import { useDrawerKeyboard } from './useDrawerKeyboard';

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

  useDrawerKeyboard(isDrawer ? aside : null, hide);

  return { open, show, hide, openButton, closeButton, aside };
}
