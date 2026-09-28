import { useCallback, useEffect, useRef, useState } from "react";

import type { SaveDraftRequest } from "~/features/client-onboarding/contracts/onboarding";

import {
  createDraftSync,
  type DraftSync,
  type PendingDraft,
  type SaveState,
} from "./draft-sync";
import { saveDraft } from "./onboarding-api-client";

export function useDraftSync(clientId: string) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const syncRef = useRef<DraftSync | null>(null);

  useEffect(() => {
    const sync = createDraftSync({
      clientId,
      onSaveStateChange: setSaveState,
      save: saveDraft,
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

  const resend = useCallback((pending: PendingDraft) => {
    syncRef.current?.resend(pending);
  }, []);

  const stopSaving = useCallback(() => {
    syncRef.current?.stopSaving();
  }, []);

  const discardUnsentDraft = useCallback(() => {
    syncRef.current?.discardUnsentDraft();
  }, []);

  return { discardUnsentDraft, queue, resend, saveState, stopSaving };
}
