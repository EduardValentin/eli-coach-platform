import { z } from "zod";

import {
  saveDraftRequestSchema,
  type SaveDraftRequest,
} from "~/features/client-onboarding/contracts/onboarding";

import type { DraftSaveOutcome } from "./onboarding-api-client";

export type SaveState = "idle" | "saving" | "saved" | "unsaved";

const SAVE_DEBOUNCE_MS = 400;

const SAVE_RETRY_INTERVAL_MS = 15_000;

const pendingDraftSchema = z.object({
  draft: saveDraftRequestSchema,
  editedAt: z.iso.datetime(),
});

export type PendingDraft = z.infer<typeof pendingDraftSchema>;

type DraftSyncOptions = {
  clientId: string;
  onSaveStateChange: (state: SaveState) => void;
  save: (draft: SaveDraftRequest) => Promise<DraftSaveOutcome>;
};

export type DraftSync = {
  queue: (draft: SaveDraftRequest) => void;
  resend: (pending: PendingDraft) => void;
  stop: () => void;
  forget: () => void;
  dispose: () => void;
};

type PendingDraftLookup = {
  clientId: string;
  serverUpdatedAt: string | null;
};

function pendingDraftKey(clientId: string): string {
  return `evoa.onboarding-pending.${clientId}`;
}

function readStoredItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function removeStoredItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
}

function parsePendingDraft(raw: string): PendingDraft | null {
  try {
    const parsed = pendingDraftSchema.safeParse(JSON.parse(raw));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function isNewerThan(
  pending: PendingDraft,
  serverUpdatedAt: string | null,
): boolean {
  return (
    serverUpdatedAt === null ||
    Date.parse(pending.editedAt) > Date.parse(serverUpdatedAt)
  );
}

export function takePendingDraft({
  clientId,
  serverUpdatedAt,
}: PendingDraftLookup): PendingDraft | null {
  const key = pendingDraftKey(clientId);
  const raw = readStoredItem(key);
  if (raw === null) return null;

  const pending = parsePendingDraft(raw);

  if (pending && isNewerThan(pending, serverUpdatedAt)) return pending;

  removeStoredItem(key);

  return null;
}

export function createDraftSync({
  clientId,
  onSaveStateChange,
  save,
}: DraftSyncOptions): DraftSync {
  const key = pendingDraftKey(clientId);
  let latest: PendingDraft | null = null;
  let saveState: SaveState = "idle";
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setInterval> | null = null;
  let disposed = false;

  const stopRetrying = () => {
    if (retryTimer !== null) clearInterval(retryTimer);
    retryTimer = null;
  };

  const cancelQueuedSave = () => {
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = null;
  };

  const changeState = (next: SaveState) => {
    saveState = next;
    if (next !== "unsaved") stopRetrying();
    onSaveStateChange(next);
  };

  const settle = (next: SaveState) => {
    latest = null;
    removeStoredItem(key);
    changeState(next);
  };

  const keepUnsaved = (pending: PendingDraft) => {
    writeStoredItem(key, JSON.stringify(pending));
    changeState("unsaved");
    retryTimer ??= setInterval(retry, SAVE_RETRY_INTERVAL_MS);
  };

  const send = (pending: PendingDraft) => {
    void save(pending.draft)
      .catch((): DraftSaveOutcome => "failed")
      .then((outcome) => {
        if (disposed || latest !== pending) return;
        if (outcome === "saved") return settle("saved");
        if (outcome === "refused") return settle("idle");

        keepUnsaved(pending);
      });
  };

  function retry() {
    if (saveState === "unsaved" && latest) send(latest);
  }

  window.addEventListener("online", retry);

  return {
    queue: (draft) => {
      const pending = { draft, editedAt: new Date().toISOString() };
      latest = pending;
      cancelQueuedSave();
      changeState("saving");
      debounceTimer = setTimeout(() => send(pending), SAVE_DEBOUNCE_MS);
    },
    resend: (pending) => {
      latest = pending;
      send(pending);
    },
    stop: () => {
      cancelQueuedSave();
      stopRetrying();
      latest = null;
    },
    forget: () => removeStoredItem(key),
    dispose: () => {
      disposed = true;
      cancelQueuedSave();
      stopRetrying();
      window.removeEventListener("online", retry);
    },
  };
}
