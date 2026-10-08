import type { UnitPreferenceSnapshot } from "@eli-coach-platform/domain/unit-preference";
import { z } from "zod";

import {
  saveDraftRequestSchema,
  type SaveDraftRequest,
} from "~/features/client-onboarding/public/onboarding";
import { unitPreferenceSchema } from "~/features/client-profile/public/unit-preference";

import type { SaveOutcome } from "./draft-autosave-requests";

export type SaveState = "idle" | "saving" | "saved" | "unsaved";

const SAVE_DEBOUNCE_MS = 400;

const SAVE_RETRY_INTERVAL_MS = 15_000;

const pendingDraftSchema = z.object({
  draft: saveDraftRequestSchema,
  editedAt: z.iso.datetime(),
});

const storedEditsSchema = z.union([
  pendingDraftSchema.extend({
    unitPreference: unitPreferenceSchema.optional(),
  }),
  z.strictObject({ unitPreference: unitPreferenceSchema }),
]);

type StoredEdits = z.infer<typeof storedEditsSchema>;

type PendingDraft = z.infer<typeof pendingDraftSchema>;

export type UnsentEdits = {
  draft: PendingDraft | null;
  unitPreference: UnitPreferenceSnapshot | null;
};

const NOTHING_UNSENT: UnsentEdits = { draft: null, unitPreference: null };

type DraftSyncOptions = {
  clientId: string;
  onSaveStateChange: (state: SaveState) => void;
  save: (draft: SaveDraftRequest) => Promise<SaveOutcome>;
  saveUnitPreference: (
    preference: UnitPreferenceSnapshot,
  ) => Promise<SaveOutcome>;
};

export type DraftSync = {
  queue: (draft: SaveDraftRequest) => void;
  queueUnitPreference: (preference: UnitPreferenceSnapshot) => void;
  resend: (unsent: UnsentEdits) => void;
  stopSaving: () => void;
  discardUnsentDraft: () => void;
  dispose: () => void;
};

type UnsentEditsLookup = {
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

function hasUnsent(unsent: UnsentEdits): boolean {
  return unsent.draft !== null || unsent.unitPreference !== null;
}

function storedEditsOf({
  draft,
  unitPreference,
}: UnsentEdits): StoredEdits | null {
  if (draft) return unitPreference ? { ...draft, unitPreference } : draft;

  return unitPreference ? { unitPreference } : null;
}

function unsentEditsOf(stored: StoredEdits): UnsentEdits {
  const unitPreference = stored.unitPreference ?? null;

  if (!("draft" in stored)) return { draft: null, unitPreference };

  return {
    draft: { draft: stored.draft, editedAt: stored.editedAt },
    unitPreference,
  };
}

function parseStoredEdits(raw: string): UnsentEdits | null {
  try {
    const parsed = storedEditsSchema.safeParse(JSON.parse(raw));

    return parsed.success ? unsentEditsOf(parsed.data) : null;
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

export function readUnsentEdits({
  clientId,
  serverUpdatedAt,
}: UnsentEditsLookup): UnsentEdits | null {
  const key = pendingDraftKey(clientId);
  const raw = readStoredItem(key);
  if (raw === null) return null;

  const stored = parseStoredEdits(raw) ?? NOTHING_UNSENT;
  const unsent: UnsentEdits = {
    draft:
      stored.draft && isNewerThan(stored.draft, serverUpdatedAt)
        ? stored.draft
        : null,
    unitPreference: stored.unitPreference,
  };

  if (hasUnsent(unsent)) return unsent;

  removeStoredItem(key);

  return null;
}

function sendIfPresent<Edit>(
  edit: Edit | null,
  save: (edit: Edit) => Promise<SaveOutcome>,
): Promise<SaveOutcome | null> {
  if (edit === null) return Promise.resolve(null);

  return save(edit).catch((): SaveOutcome => "failed");
}

function remainingAfter<Edit>(
  current: Edit | null,
  sent: Edit | null,
  outcome: SaveOutcome | null,
): Edit | null {
  return outcome !== "failed" && current === sent ? null : current;
}

export function createDraftSync({
  clientId,
  onSaveStateChange,
  save,
  saveUnitPreference,
}: DraftSyncOptions): DraftSync {
  const key = pendingDraftKey(clientId);
  let unsent: UnsentEdits = NOTHING_UNSENT;
  let editCount = 0;
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

  const storeUnsent = () => {
    const stored = storedEditsOf(unsent);

    if (stored) {
      writeStoredItem(key, JSON.stringify(stored));
      return;
    }

    removeStoredItem(key);
  };

  const recordEdit = (next: UnsentEdits) => {
    unsent = next;
    editCount += 1;
    cancelQueuedSave();
    changeState("saving");
  };

  const send = () => {
    const sending = unsent;
    const sentAtEdit = editCount;

    void Promise.all([
      sendIfPresent(sending.draft, (pending) => save(pending.draft)),
      sendIfPresent(sending.unitPreference, saveUnitPreference),
    ]).then(([draftOutcome, unitOutcome]) => {
      if (disposed) return;

      unsent = {
        draft: remainingAfter(unsent.draft, sending.draft, draftOutcome),
        unitPreference: remainingAfter(
          unsent.unitPreference,
          sending.unitPreference,
          unitOutcome,
        ),
      };

      if (sentAtEdit !== editCount) return;

      storeUnsent();

      if (hasUnsent(unsent)) {
        changeState("unsaved");
        retryTimer ??= setInterval(retry, SAVE_RETRY_INTERVAL_MS);
        return;
      }

      const refused = draftOutcome === "refused" || unitOutcome === "refused";
      changeState(refused ? "idle" : "saved");
    });
  };

  function retry() {
    if (saveState === "unsaved" && hasUnsent(unsent)) send();
  }

  window.addEventListener("online", retry);

  return {
    queue: (draft) => {
      recordEdit({
        ...unsent,
        draft: { draft, editedAt: new Date().toISOString() },
      });
      debounceTimer = setTimeout(send, SAVE_DEBOUNCE_MS);
    },
    queueUnitPreference: (preference) => {
      recordEdit({ ...unsent, unitPreference: preference });
      send();
    },
    resend: (next) => {
      unsent = next;
      editCount += 1;
      send();
    },
    stopSaving: () => {
      cancelQueuedSave();
      unsent = { ...unsent, draft: null };
      editCount += 1;
      if (!hasUnsent(unsent)) stopRetrying();
    },
    discardUnsentDraft: () => {
      unsent = { ...unsent, draft: null };
      storeUnsent();
    },
    dispose: () => {
      disposed = true;
      cancelQueuedSave();
      stopRetrying();
      window.removeEventListener("online", retry);
    },
  };
}
