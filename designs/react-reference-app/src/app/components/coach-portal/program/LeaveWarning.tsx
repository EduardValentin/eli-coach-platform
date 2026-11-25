import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ConfirmDialog } from '../../ui/confirm-dialog';
import { hasUnsentChanges, type DraftSaving } from './useAutosavedDraft';

type LeavingLink = { element: HTMLAnchorElement; to: string };

function isOnBuilder(pathname: string, draftPath: string): boolean {
  return pathname === draftPath || pathname.startsWith(`${draftPath}/`);
}

function opensElsewhere(event: MouseEvent, link: HTMLAnchorElement): boolean {
  const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  return modified || event.button !== 0 || (link.target !== '' && link.target !== '_self');
}

function leavingLinkOf(event: MouseEvent, draftPath: string): LeavingLink | null {
  if (event.defaultPrevented || !(event.target instanceof Element)) return null;
  const element = event.target.closest('a[href]');
  if (!(element instanceof HTMLAnchorElement) || opensElsewhere(event, element)) return null;
  const url = new URL(element.href);
  if (url.origin !== window.location.origin || isOnBuilder(url.pathname, draftPath)) return null;
  return { element, to: `${url.pathname}${url.search}${url.hash}` };
}

function warnBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
  event.returnValue = '';
}

type LeaveWarningProps = { draftPath: string; saving: DraftSaving };

export function LeaveWarning({ draftPath, saving }: LeaveWarningProps) {
  const navigate = useNavigate();
  const [leavingTo, setLeavingTo] = useState<string | null>(null);
  const usedLink = useRef<HTMLElement | null>(null);
  const latestSaving = useRef(saving);
  latestSaving.current = saving;
  const unsent = hasUnsentChanges(saving.state);

  useEffect(() => {
    if (!unsent) return;
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [unsent]);

  useEffect(() => {
    if (!unsent) return;
    const holdLeaving = (event: MouseEvent) => {
      const link = leavingLinkOf(event, draftPath);
      if (!link) return;
      event.preventDefault();
      event.stopPropagation();
      usedLink.current = link.element;
      if (latestSaving.current.failing) {
        setLeavingTo(link.to);
        return;
      }
      void latestSaving.current.saveNow().then(result => {
        if (result === 'saved') navigate(link.to);
        if (result === 'not-saved') setLeavingTo(link.to);
      });
    };
    document.addEventListener('click', holdLeaving, true);
    return () => document.removeEventListener('click', holdLeaving, true);
  }, [unsent, draftPath, navigate]);

  function leaveWithoutSaving() {
    setLeavingTo(null);
    if (leavingTo) navigate(leavingTo);
  }

  return (
    <ConfirmDialog
      open={leavingTo !== null}
      onOpenChange={open => {
        if (!open) setLeavingTo(null);
      }}
      title="Unsaved changes"
      description="Your latest changes aren’t saved yet. If you leave now, they’re lost."
      cancelLabel="Keep editing"
      confirmLabel="Leave without saving"
      tone="destructive"
      returnFocusTo={usedLink}
      onConfirm={leaveWithoutSaving}
    />
  );
}
