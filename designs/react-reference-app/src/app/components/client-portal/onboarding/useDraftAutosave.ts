import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppState } from '../../../context/AppContext';
import { useClientJourneys } from '../../../context/ClientJourneyContext';
import type { OnboardingDraft } from '../../../domain/journey';
import { saveDraft } from '../../../services/onboardingService';

const SAVE_DEBOUNCE_MS = 400;

const SAVE_RETRY_INTERVAL_MS = 15_000;

export type SaveState = 'idle' | 'saving' | 'saved' | 'unsaved';

export function useDraftAutosave(journeyId: string) {
  const { appState } = useAppState();
  const { saveOnboardingDraft } = useClientJourneys();
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const saveTimer = useRef<number | null>(null);
  const inFlightSave = useRef<Promise<unknown> | null>(null);
  const latestDraftToSave = useRef<OnboardingDraft | null>(null);
  const connection = useRef(appState.journeyConnection);
  connection.current = appState.journeyConnection;

  const sendDraft = useCallback(
    (draft: OnboardingDraft) => {
      latestDraftToSave.current = draft;
      const isLatest = () => latestDraftToSave.current === draft;

      inFlightSave.current = saveDraft(journeyId, draft, connection.current)
        .then(() => {
          if (!isLatest()) return;
          latestDraftToSave.current = null;
          setSaveState('saved');
        })
        .catch(() => {
          if (!isLatest()) return;
          setSaveState('unsaved');
        });
    },
    [journeyId],
  );

  const cancelQueuedSave = useCallback(() => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
  }, []);

  const queueDraftSave = useCallback(
    (draft: OnboardingDraft) => {
      setSaveState('saving');
      cancelQueuedSave();
      saveTimer.current = window.setTimeout(() => {
        saveOnboardingDraft(journeyId, draft);
        sendDraft(draft);
      }, SAVE_DEBOUNCE_MS);
    },
    [cancelQueuedSave, journeyId, saveOnboardingDraft, sendDraft],
  );

  const pendingSave = useCallback(() => inFlightSave.current, []);

  useEffect(() => {
    if (saveState !== 'unsaved') return;

    const retry = () => {
      if (latestDraftToSave.current) sendDraft(latestDraftToSave.current);
    };
    const retryTimer = window.setInterval(retry, SAVE_RETRY_INTERVAL_MS);
    window.addEventListener('online', retry);

    return () => {
      window.clearInterval(retryTimer);
      window.removeEventListener('online', retry);
    };
  }, [saveState, sendDraft]);

  return { saveState, queueDraftSave, cancelQueuedSave, pendingSave };
}
