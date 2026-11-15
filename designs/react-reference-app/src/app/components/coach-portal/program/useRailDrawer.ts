import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useIsDesktop } from '../../ui/use-desktop';
import { useDrawerKeyboard } from './useDrawerKeyboard';

type InertProps = { inert?: '' };

function inertWhen(condition: boolean): InertProps {
  return condition ? { inert: '' } : {};
}

export function useRailDrawer() {
  const [open, setOpen] = useState(false);
  const focusPending = useRef(false);
  const openButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const aside = useRef<HTMLElement>(null);
  const isDesktop = useIsDesktop();
  const isDrawer = open && !isDesktop;
  const { pathname } = useLocation();

  function show() {
    focusPending.current = true;
    setOpen(true);
  }

  function hide() {
    focusPending.current = isDrawer;
    setOpen(false);
  }

  useEffect(() => {
    if (!focusPending.current) return;
    const target = (open ? closeButton : openButton).current;
    if (!target) return;
    target.focus();
    focusPending.current = document.activeElement !== target;
  }, [open, pathname]);

  useDrawerKeyboard(isDrawer ? aside : null, hide);

  return {
    open,
    isDrawer,
    show,
    hide,
    openButton,
    closeButton,
    aside,
    asideProps: inertWhen(!open && !isDesktop),
    behindProps: inertWhen(isDrawer),
  };
}
