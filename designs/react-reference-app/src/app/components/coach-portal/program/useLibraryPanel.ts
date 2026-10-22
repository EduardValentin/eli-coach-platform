import { useEffect, useRef, useState } from 'react';
import type { Exercise } from '../../../context/TrainingContext';
import type { Block } from '../../../domain/program';
import type { LibraryTarget } from '../../../domain/programEditing';
import { slotPlanFor } from '../../../domain/splitTemplates';
import { wrapTabWithin } from '../../../utils/focusTrap';
import { useIsWide } from '../../ui/use-desktop';
import type { LibraryPurpose } from './LibraryPanel';

type PanelTarget = { target: LibraryTarget; nonce: number };

export function libraryPurpose(block: Block | undefined, panelTarget: PanelTarget | null, library: readonly Exercise[]): LibraryPurpose | null {
  if (!block || !panelTarget) return null;
  const { target, nonce } = panelTarget;
  const key = `${nonce}`;
  if (target.kind === 'cardio-exercise' || target.kind === 'rounds-item') {
    const cardio = block.cardioSessions.find(other => other.id === target.sessionId);
    if (!cardio) return null;
    const label = `Adding to ${cardio.name}`;
    if (target.kind === 'rounds-item') return { key, label, type: 'resistance', patterns: [], equipment: 'bodyweight' };
    return { key, label, type: 'cardio', patterns: [], equipment: 'hers' };
  }
  const session = block.sessions.find(other => other.id === target.sessionId);
  if (!session) return null;
  if (target.kind === 'warm-up') return { key, label: `Adding to ${session.name} · Warm-up`, type: 'mobility', patterns: [], equipment: 'hers' };
  if (target.kind === 'slot') {
    const plan = slotPlanFor(block, session, target.slot);
    return { key, label: `Adding to ${session.name} · ${plan?.label ?? target.slot}`, type: 'resistance', patterns: plan?.patterns ?? [], equipment: 'hers' };
  }
  const row = session.rows.find(other => other.id === target.rowId);
  const exercise = library.find(item => item.id === row?.exerciseId);
  return {
    key,
    label: `Adding a substitution for ${exercise?.name ?? 'this exercise'}`,
    type: 'resistance',
    patterns: exercise?.pattern ? [exercise.pattern] : [],
    equipment: 'hers',
  };
}

export function useLibraryPanel() {
  const isWide = useIsWide();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [panelTarget, setPanelTarget] = useState<PanelTarget | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [returnRequest, setReturnRequest] = useState(0);
  const opener = useRef<HTMLElement | null>(null);
  const openings = useRef(0);
  const aside = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const visible = isWide ? !collapsed : drawerOpen;
  const isDrawer = visible && !isWide;

  function rememberOpener() {
    if (document.activeElement instanceof HTMLElement) opener.current = document.activeElement;
  }

  function show() {
    rememberOpener();
    setCollapsed(false);
    setDrawerOpen(true);
    setFocusRequest(count => count + 1);
  }

  function openFor(next: LibraryTarget) {
    openings.current += 1;
    setPanelTarget({ target: next, nonce: openings.current });
    show();
  }

  function close() {
    setPanelTarget(null);
    setDrawerOpen(false);
    setReturnRequest(count => count + 1);
  }

  function toggle() {
    if (isWide) setCollapsed(current => !current);
    else if (drawerOpen) close();
    else show();
  }

  function finishTarget() {
    if (!panelTarget) return;
    if (isWide) setPanelTarget(null);
    else close();
  }

  useEffect(() => {
    if (focusRequest > 0) search.current?.focus();
  }, [focusRequest]);

  useEffect(() => {
    if (returnRequest > 0 && opener.current?.isConnected) opener.current.focus();
  }, [returnRequest]);

  useEffect(() => {
    if (!isDrawer) return;
    const keepKeyboardInDrawer = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) close();
      if (event.key === 'Tab') wrapTabWithin(aside.current, event);
    };
    document.addEventListener('keydown', keepKeyboardInDrawer);
    return () => document.removeEventListener('keydown', keepKeyboardInDrawer);
  }, [isDrawer]);

  return { isWide, visible, panelTarget, aside, search, openFor, close, toggle, finishTarget, dismissTarget: () => setPanelTarget(null) };
}
