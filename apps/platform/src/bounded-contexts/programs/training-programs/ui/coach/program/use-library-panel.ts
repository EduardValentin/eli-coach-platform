import { useIsWideViewport } from "~/shared/design-system/lib";
import { useEffect, useRef, useState } from "react";

import {
  LibrarySelection,
  SplitTemplate,
  type Block,
  type LibraryExercise,
  type LibraryOffer,
  type LibraryTarget,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { type FocusTarget } from "./use-pending-focus";

type PanelTarget = { target: LibraryTarget; nonce: number };

export type LibraryPurpose = {
  key: string;
  label: string;
  destination: string;
  offer: LibraryOffer;
};

type PurposeWording = Pick<LibraryPurpose, "label" | "destination">;

function placeWording(sessionName: string, place: string): PurposeWording {
  return {
    label: `Adding to ${sessionName} · ${place}`,
    destination: `${sessionName} · ${place}`,
  };
}

function substitutionWording(name: string): PurposeWording {
  return {
    label: `Adding a substitution for ${name}`,
    destination: `the substitutions for ${name}`,
  };
}

function wordingOf(
  target: LibraryTarget,
  block: Block,
  libraryExercises: readonly LibraryExercise[],
): PurposeWording | null {
  const session = block.sessions.find((other) => other.id === target.sessionId);
  if (!session) return null;
  if (target.kind === "warm-up") return placeWording(session.name, "Warm-up");
  if (target.kind === "cool-down") {
    return placeWording(session.name, "Cool-down");
  }
  if (target.kind === "slot") {
    const label =
      SplitTemplate.slotPlanFor(block, session, target.slot)?.label ??
      target.slot;

    return placeWording(session.name, `${target.slot} ${label}`);
  }
  const row = session.rows.find((other) => other.id === target.rowId);
  const exercise = libraryExercises.find((item) => item.id === row?.exerciseId);

  return substitutionWording(exercise?.name ?? "this exercise");
}

export function libraryPurpose(
  block: Block,
  panelTarget: PanelTarget | null,
  libraryExercises: readonly LibraryExercise[],
): LibraryPurpose | null {
  if (!panelTarget) return null;
  const { target, nonce } = panelTarget;
  const offer = LibrarySelection.offerFor(target, { block, libraryExercises });
  const wording = wordingOf(target, block, libraryExercises);
  if (!offer || !wording) return null;

  return { key: `${nonce}`, ...wording, offer };
}

export function useLibraryPanel() {
  const isWide = useIsWideViewport();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [panelTarget, setPanelTarget] = useState<PanelTarget | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const openings = useRef(0);
  const search = useRef<HTMLInputElement>(null);
  const opener = useRef<Element | null>(null);
  const focusAfterClose = useRef<FocusTarget | null>(null);
  const visible = isWide ? !collapsed : drawerOpen;

  function show() {
    setCollapsed(false);
    setDrawerOpen(true);
    setFocusRequest((count) => count + 1);
  }

  function openFor(next: LibraryTarget) {
    opener.current = document.activeElement;
    openings.current += 1;
    setPanelTarget({ target: next, nonce: openings.current });
    show();
  }

  function close() {
    setPanelTarget(null);
    setDrawerOpen(false);
  }

  function collapse() {
    setPanelTarget(null);
    setCollapsed(true);
  }

  function toggle() {
    if (!visible) show();
    else if (isWide) collapse();
    else close();
  }

  function finishTarget(focusInstead?: FocusTarget) {
    if (!panelTarget || isWide) return;
    focusAfterClose.current = focusInstead ?? null;
    close();
  }

  function focusAfterDrawerCloses(event: Event) {
    const find = focusAfterClose.current;
    focusAfterClose.current = null;
    const openerStays =
      opener.current?.isConnected && opener.current !== document.body;
    const target = !openerStays && find?.();
    if (!target) return;

    event.preventDefault();
    target.focus();
  }

  useEffect(() => {
    if (focusRequest > 0) search.current?.focus();
  }, [focusRequest]);

  return {
    isWide,
    visible,
    panelTarget,
    search,
    openFor,
    close,
    toggle,
    finishTarget,
    focusAfterDrawerCloses,
  };
}
