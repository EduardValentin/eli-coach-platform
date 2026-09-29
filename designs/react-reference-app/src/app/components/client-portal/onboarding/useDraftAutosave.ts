import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppState } from '../../../context/AppContext';
import { useClientJourneys } from '../../../context/ClientJourneyContext';
import type { OnboardingDraft } from '../../../domain/journey';
import {
  saveDraft,
  saveUnitPreference,
  type UnitPreference,
} from '../../../services/onboardingService';

const SAVE_DEBOUNCE_MS = 400;

const SAVE_RETRY_INTERVAL_MS = 15_000;

export type SaveState = 'idle' | 'saving' | 'saved' | 'unsaved';

type UnsentEdits = {
  draft: OnboardingDraft | null;
  unitPreference: UnitPreference | null;
};

const NOTHING_UNSENT: UnsentEdits = { draft: null, unitPreference: null };

function hasUnsent(unsent: UnsentEdits): boolean {
  return unsent.draft !== null || unsent.unitPreference !== null;
}

function sendIfPresent<Edit>(
  edit: Edit | null,
  save: (edit: Edit) => Promise<unknown>,
): Promise<boolean> {
  if (edit === null) return Promise.resolve(true);

  return save(edit).then(
    () => true,
    () => false,
  );
}

function remainingAfter<Edit>(
  current: Edit | null,
  sent: Edit | null,
  saved: boolean,
): Edit | null {
  return saved && current === sent ? null : current;
}

export function useDraftAutosave(journeyId: string) {
  const { appState } = useAppState();
  const { saveOnboardingDraft } = useClientJourneys();
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const saveTimer = useRef<number | null>(null);
  const inFlightSave = useRef<Promise<unknown> | null>(null);
  const unsent = useRef<UnsentEdits>(NOTHING_UNSENT);
  const editCount = useRef(0);
  const connection = useRef(appState.journeyConnection);
  connection.current = appState.journeyConnection;

  const send = useCallback(() => {
    const sending = unsent.current;
    const sentAtEdit = editCount.current;

    inFlightSave.current = Promise.all([
      sendIfPresent(sending.draft, (draft) =>
        saveDraft(journeyId, draft, connection.current),
      ),
      sendIfPresent(sending.unitPreference, (preference) =>
        saveUnitPreference(journeyId, preference, connection.current),
      ),
    ]).then(([draftSaved, unitsSaved]) => {
      unsent.current = {
        draft: remainingAfter(unsent.current.draft, sending.draft, draftSaved),
        unitPreference: remainingAfter(
          unsent.current.unitPreference,
          sending.unitPreference,
          unitsSaved,
        ),
      };

      if (sentAtEdit !== editCount.current) return;

      setSaveState(hasUnsent(unsent.current) ? 'unsaved' : 'saved');
    });
  }, [journeyId]);

  const cancelQueuedSave = useCallback(() => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
  }, []);

  const recordEdit = useCallback(
    (next: UnsentEdits) => {
      unsent.current = next;
      editCount.current += 1;
      cancelQueuedSave();
      setSaveState('saving');
    },
    [cancelQueuedSave],
  );

  const queueDraftSave = useCallback(
    (draft: OnboardingDraft) => {
      recordEdit({ ...unsent.current, draft });
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null;
        saveOnboardingDraft(journeyId, draft);
        send();
      }, SAVE_DEBOUNCE_MS);
    },
    [journeyId, recordEdit, saveOnboardingDraft, send],
  );

  const queueUnitPreferenceSave = useCallback(
    (unitPreference: UnitPreference) => {
      const queuedDraft =
        saveTimer.current === null ? null : unsent.current.draft;
      recordEdit({ ...unsent.current, unitPreference });
      if (queuedDraft) saveOnboardingDraft(journeyId, queuedDraft);
      send();
    },
    [journeyId, recordEdit, saveOnboardingDraft, send],
  );

  const pendingSave = useCallback(() => inFlightSave.current, []);

  useEffect(() => {
    if (saveState !== 'unsaved') return;

    const retry = () => {
      if (hasUnsent(unsent.current)) send();
    };
    const retryTimer = window.setInterval(retry, SAVE_RETRY_INTERVAL_MS);
    window.addEventListener('online', retry);

    return () => {
      window.clearInterval(retryTimer);
      window.removeEventListener('online', retry);
    };
  }, [saveState, send]);

  return {
    saveState,
    queueDraftSave,
    queueUnitPreferenceSave,
    cancelQueuedSave,
    pendingSave,
  };
}
