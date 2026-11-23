import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../../../context/AppContext';
import { usePrograms } from '../../../context/ProgramContext';
import { draftOf, type Program } from '../../../domain/program';
import { saveDraftThroughServer } from '../../../services/programWriteService';
import { useEditorAnnouncer } from './editorAnnouncer';

const SAVE_DELAY_MS = 800;
const SAVE_RETRY_INTERVAL_MS = 15_000;

export type SaveState = 'unchanged' | 'saving' | 'saved' | 'not-saved' | 'changed-elsewhere';
type SaveResult = 'saved' | 'not-saved' | 'changed-elsewhere';
type ProgramChange = (program: Program) => Program;

export type DraftSaving = {
  state: SaveState;
  failing: boolean;
  retrying: boolean;
  retryNow: () => void;
  saveNow: () => Promise<SaveResult>;
  reload: () => void;
};

export function hasUnsentChanges(state: SaveState): boolean {
  return state === 'saving' || state === 'not-saved';
}

/**
 * Holds the program as the builder shows it, which is the stored one until she changes it. A change shows at once
 * and reaches the store through one mocked save at a time, sent after a short delay; a failed save is tried again on a
 * timer, when the connection returns and with the next change, and a save refused because the draft changed elsewhere
 * locks the builder until it reloads the draft.
 */
export function useDraftSaving(stored: Program) {
  const { appState } = useAppState();
  const { updateDraftVersion, updateSetup } = usePrograms();
  const announce = useEditorAnnouncer();
  const [program, setProgram] = useState(stored);
  const [state, setState] = useState<SaveState>('unchanged');
  const [failing, setFailing] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const shown = useRef(stored);
  const outcome = useRef(appState.draftSave);
  outcome.current = appState.draftSave;
  const edits = useRef({ made: 0, saved: 0 });
  const failed = useRef(false);
  const refused = useRef(false);
  const queuedSave = useRef<number | null>(null);
  const inFlight = useRef<Promise<SaveResult> | null>(null);

  function cancelQueuedSave() {
    if (queuedSave.current !== null) window.clearTimeout(queuedSave.current);
    queuedSave.current = null;
  }

  function writeToStore(sent: Program) {
    const draft = draftOf(sent);
    if (!draft) return;
    updateDraftVersion(sent.callId, () => draft);
    updateSetup(sent.callId, { level: sent.level, language: sent.language });
  }

  function markFailing(next: boolean) {
    failed.current = next;
    setFailing(next);
  }

  function settle(result: SaveResult, sentAtEdit: number) {
    if (result === 'changed-elsewhere') {
      refused.current = true;
      cancelQueuedSave();
      markFailing(false);
      setState('changed-elsewhere');
      return;
    }
    if (result === 'not-saved') {
      markFailing(true);
      if (queuedSave.current === null) setState('not-saved');
      return;
    }
    edits.current.saved = sentAtEdit;
    if (failed.current) {
      markFailing(false);
      announce('All changes saved.');
    }
    if (sentAtEdit === edits.current.made) setState('saved');
  }

  async function saveNow(): Promise<SaveResult> {
    cancelQueuedSave();
    while (inFlight.current) await inFlight.current;
    if (refused.current) return 'changed-elsewhere';
    if (edits.current.saved === edits.current.made) return 'saved';
    const sentAtEdit = edits.current.made;
    const sent = shown.current;
    setState('saving');
    const pending = saveDraftThroughServer(outcome.current, () => writeToStore(sent)).catch((): SaveResult => 'not-saved');
    inFlight.current = pending;
    const result = await pending;
    inFlight.current = null;
    settle(result, sentAtEdit);
    return result;
  }

  function change(update: ProgramChange) {
    if (refused.current) return;
    show(update(shown.current));
    edits.current.made += 1;
    setState('saving');
    cancelQueuedSave();
    queuedSave.current = window.setTimeout(() => {
      queuedSave.current = null;
      void saveNow();
    }, SAVE_DELAY_MS);
  }

  async function retryNow() {
    setRetrying(true);
    const result = await saveNow();
    setRetrying(false);
    if (result === 'not-saved') announce('Still not saved.');
  }

  function show(next: Program) {
    shown.current = next;
    setProgram(next);
  }

  function reload() {
    show(stored);
    edits.current = { made: 0, saved: 0 };
    refused.current = false;
    markFailing(false);
    setState('unchanged');
  }

  useEffect(() => {
    if (!failing) return;
    const retry = () => void saveNow();
    const retryTimer = window.setInterval(retry, SAVE_RETRY_INTERVAL_MS);
    window.addEventListener('online', retry);
    return () => {
      window.clearInterval(retryTimer);
      window.removeEventListener('online', retry);
    };
    // saveNow reads only refs and stable setters, so the one from the render that started failing stays correct.
  }, [failing]);

  useEffect(() => {
    if (edits.current.made === 0) show(stored);
  }, [stored]);

  useEffect(() => cancelQueuedSave, []);

  const saving: DraftSaving = {
    state,
    failing,
    retrying,
    retryNow: () => void retryNow(),
    saveNow,
    reload,
  };
  return { program, change, saving, storeShownDraft: () => writeToStore(shown.current) };
}
