import { ConfirmDialog } from "~/shared/design-system/overlays";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { hasUnsentChanges, type DraftSaving } from "./use-autosaved-draft";

type LeavingLink = { element: HTMLAnchorElement; to: string };

function isOnBuilder(pathname: string, builderPath: string): boolean {
  return pathname === builderPath || pathname.startsWith(`${builderPath}/`);
}

function opensElsewhere(event: MouseEvent, link: HTMLAnchorElement): boolean {
  const modified =
    event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

  return (
    modified ||
    event.button !== 0 ||
    (link.target !== "" && link.target !== "_self")
  );
}

function leavingLinkOf(
  event: MouseEvent,
  builderPath: string,
): LeavingLink | null {
  if (event.defaultPrevented || !(event.target instanceof Element)) return null;
  const element = event.target.closest("a[href]");
  if (!(element instanceof HTMLAnchorElement) || opensElsewhere(event, element))
    return null;
  const url = new URL(element.href);
  if (
    url.origin !== window.location.origin ||
    isOnBuilder(url.pathname, builderPath)
  )
    return null;

  return { element, to: `${url.pathname}${url.search}${url.hash}` };
}

function warnBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
  event.returnValue = "";
}

type LeaveWarningProps = { builderPath: string; saving: DraftSaving };

export function LeaveWarning({ builderPath, saving }: LeaveWarningProps) {
  const navigate = useNavigate();
  const [leavingTo, setLeavingTo] = useState<string | null>(null);
  const usedLink = useRef<HTMLElement | null>(null);
  const latestSaving = useRef(saving);
  latestSaving.current = saving;
  const unsent = hasUnsentChanges(saving.state);

  useEffect(() => {
    if (!unsent) return;
    window.addEventListener("beforeunload", warnBeforeUnload);

    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [unsent]);

  useEffect(() => {
    if (!unsent) return;
    const holdLeaving = (event: MouseEvent) => {
      const link = leavingLinkOf(event, builderPath);
      if (!link) return;
      event.preventDefault();
      event.stopPropagation();
      usedLink.current = link.element;
      if (latestSaving.current.failing) {
        setLeavingTo(link.to);
        return;
      }
      void latestSaving.current.saveNow().then((result) => {
        if (result === "saved") navigate(link.to);
        if (result === "not-saved") setLeavingTo(link.to);
      });
    };
    document.addEventListener("click", holdLeaving, true);

    return () => document.removeEventListener("click", holdLeaving, true);
  }, [unsent, builderPath, navigate]);

  function leaveWithoutSaving() {
    setLeavingTo(null);
    if (leavingTo) navigate(leavingTo);
  }

  return (
    <ConfirmDialog
      cancelLabel="Keep editing"
      confirmLabel="Leave without saving"
      description="Your latest changes aren’t saved yet. If you leave now, they’re lost."
      onConfirm={leaveWithoutSaving}
      onOpenChange={(open) => {
        if (!open) setLeavingTo(null);
      }}
      open={leavingTo !== null}
      returnFocusTo={usedLink}
      title="Unsaved changes"
      tone="destructive"
    />
  );
}
