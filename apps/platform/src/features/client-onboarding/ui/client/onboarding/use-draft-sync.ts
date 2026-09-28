import type { UnitPreferenceSnapshot } from "@eli-coach-platform/domain/unit-preference";
import { useCallback, useEffect, useRef, useState } from "react";

import type { SaveDraftRequest } from "~/features/client-onboarding/contracts/onboarding";

import {
  createDraftSync,
  type DraftSync,
  type SaveState,
  type UnsentEdits,
} from "./draft-sync";
import { saveDraft, saveUnitPreference } from "./onboarding-api-client";

export function useDraftSync(clientId: string) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const syncRef = useRef<DraftSync | null>(null);

  useEffect(() => {
    const sync = createDraftSync({
      clientId,
      onSaveStateChange: setSaveState,
      save: saveDraft,
      saveUnitPreference,
    });
    syncRef.current = sync;

    return () => {
      sync.dispose();
      syncRef.current = null;
    };
  }, [clientId]);

  const queue = useCallback((draft: SaveDraftRequest) => {
    syncRef.current?.queue(draft);
  }, []);

  const queueUnitPreference = useCallback(
    (preference: UnitPreferenceSnapshot) => {
      syncRef.current?.queueUnitPreference(preference);
    },
    [],
  );

  const resend = useCallback((unsent: UnsentEdits) => {
    syncRef.current?.resend(unsent);
  }, []);

  const stopSaving = useCallback(() => {
    syncRef.current?.stopSaving();
  }, []);

  const discardUnsentDraft = useCallback(() => {
    syncRef.current?.discardUnsentDraft();
  }, []);

  return {
    discardUnsentDraft,
    queue,
    queueUnitPreference,
    resend,
    saveState,
    stopSaving,
  };
}
