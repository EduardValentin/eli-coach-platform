import { useEffect, useRef, useState } from 'react';
import type { Exercise } from '../../../context/TrainingContext';
import type { Block } from '../../../domain/program';
import type { LibraryTarget } from '../../../domain/programEditing';
import { slotPlanFor } from '../../../domain/splitTemplates';
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
    if (target.kind === 'rounds-item') {
      return { key, label, destination: `${cardio.name} · Intervals`, type: 'cardio', alsoTagged: 'Conditioning', patterns: [] };
    }
    return { key, label, destination: cardio.name, type: 'cardio', patterns: [] };
  }
  const session = block.sessions.find(other => other.id === target.sessionId);
  if (!session) return null;
  const into = (place: string) => ({ key, label: `Adding to ${session.name} · ${place}`, destination: `${session.name} · ${place}` });
  if (target.kind === 'warm-up') return { ...into('Warm-up'), type: 'mobility', alsoTagged: 'Conditioning', patterns: [] };
  if (target.kind === 'cool-down') return { ...into('Cool-down'), type: 'stretching', patterns: [] };
  if (target.kind === 'slot') {
    const plan = slotPlanFor(block, session, target.slot);
    const label = plan?.label ?? target.slot;
    return { ...into(`${target.slot} ${label}`), type: 'resistance', patterns: [] };
  }
  const row = session.rows.find(other => other.id === target.rowId);
  const exercise = library.find(item => item.id === row?.exerciseId);
  const name = exercise?.name ?? 'this exercise';
  return {
    key,
    label: `Adding a substitution for ${name}`,
    destination: `the substitutions for ${name}`,
    type: 'resistance',
    patterns: exercise?.pattern ? [exercise.pattern] : [],
  };
}

export function useLibraryPanel() {
  const isWide = useIsWide();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [panelTarget, setPanelTarget] = useState<PanelTarget | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const openings = useRef(0);
  const search = useRef<HTMLInputElement>(null);
  const visible = isWide ? !collapsed : drawerOpen;

  function show() {
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

  function finishTarget() {
    if (panelTarget && !isWide) close();
  }

  useEffect(() => {
    if (focusRequest > 0) search.current?.focus();
  }, [focusRequest]);

  return { isWide, visible, panelTarget, search, openFor, close, toggle, finishTarget };
}
