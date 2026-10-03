// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UnitPreferenceSnapshot } from "@eli-coach-platform/domain/unit-preference";

import type { SaveDraftRequest } from "~/features/client-onboarding/contracts/onboarding";

import type { SaveOutcome } from "./draft-autosave-requests";
import {
  createDraftSync,
  type DraftSync,
  readUnsentEdits,
  type SaveState,
} from "./draft-sync";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const PENDING_DRAFT_KEY = `evoa.onboarding-pending.${CLIENT_ID}`;
const NOW = new Date("2026-09-28T10:00:00.000Z");
const DEBOUNCE_MS = 400;
const RETRY_INTERVAL_MS = 15_000;
const IMPERIAL: UnitPreferenceSnapshot = {
  weightUnit: "lb",
  heightUnit: "ft-in",
};

function draftWithWeight(weight: number): SaveDraftRequest {
  return {
    formId: "goal-availability",
    answers: {
      "goal-availability": { weight },
      "safety-screening": {},
      "cycle-context": {},
      "nutrition-lifestyle": {},
      measurements: {},
    },
    currentFormIndex: 0,
    consents: {
      specialCategoryAt: null,
      disclaimerAt: null,
      progressPhotosAt: null,
    },
  };
}

let startedSyncs: DraftSync[] = [];

type SyncOutcomes = {
  drafts?: SaveOutcome[];
  unitPreferences?: SaveOutcome[];
};

function startSync(outcomes: SaveOutcome[]) {
  return startSyncAnswering({ drafts: outcomes });
}

function startSyncAnswering({
  drafts = [],
  unitPreferences = [],
}: SyncOutcomes) {
  const states: SaveState[] = [];
  const save = vi.fn(async (_draft: SaveDraftRequest) => {
    return drafts.shift() ?? "saved";
  });
  const saveUnitPreference = vi.fn(
    async (_preference: UnitPreferenceSnapshot) => {
      return unitPreferences.shift() ?? "saved";
    },
  );
  const sync = createDraftSync({
    clientId: CLIENT_ID,
    onSaveStateChange: (state) => states.push(state),
    save,
    saveUnitPreference,
  });
  startedSyncs.push(sync);

  return { save, saveUnitPreference, states, sync };
}

function bufferedEntry(): unknown {
  const raw = window.localStorage.getItem(PENDING_DRAFT_KEY);

  return raw === null ? null : JSON.parse(raw);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  window.localStorage.clear();
});

afterEach(() => {
  for (const sync of startedSyncs) sync.dispose();
  startedSyncs = [];
  vi.useRealTimers();
  window.localStorage.clear();
});

describe("createDraftSync", () => {
  it("waits for her to pause, then saves only her latest draft", async () => {
    // arrange
    const { save, states, sync } = startSync(["saved"]);

    // act
    sync.queue(draftWithWeight(6));
    sync.queue(draftWithWeight(66));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    // assert
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(draftWithWeight(66));
    expect(states.at(0)).toBe("saving");
    expect(states.at(-1)).toBe("saved");
  });

  it("keeps an unsaved draft on the device and says it is not saved yet", async () => {
    // arrange
    const { states, sync } = startSync(["failed"]);

    // act
    sync.queue(draftWithWeight(66));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    // assert
    expect(states.at(-1)).toBe("unsaved");
    expect(bufferedEntry()).toEqual({
      draft: draftWithWeight(66),
      editedAt: NOW.toISOString(),
    });
  });

  it("saves the unsent draft once the browser is back online", async () => {
    // arrange
    const { save, states, sync } = startSync(["failed", "saved"]);
    sync.queue(draftWithWeight(66));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    // act
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(0);

    // assert
    expect(save).toHaveBeenCalledTimes(2);
    expect(states.at(-1)).toBe("saved");
    expect(bufferedEntry()).toBeNull();
  });

  it("tries the unsent draft again every fifteen seconds", async () => {
    // arrange
    const { save, states, sync } = startSync(["failed", "failed", "saved"]);
    sync.queue(draftWithWeight(66));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    // act
    await vi.advanceTimersByTimeAsync(RETRY_INTERVAL_MS * 2);

    // assert
    expect(save).toHaveBeenCalledTimes(3);
    expect(states.at(-1)).toBe("saved");
  });

  it("sends the unsent draft with her next change", async () => {
    // arrange
    const { save, states, sync } = startSync(["failed", "saved"]);
    sync.queue(draftWithWeight(66));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    // act
    sync.queue(draftWithWeight(67));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    // assert
    expect(save).toHaveBeenLastCalledWith(draftWithWeight(67));
    expect(states.at(-1)).toBe("saved");
    expect(bufferedEntry()).toBeNull();
  });

  it("stops trying once the server refuses the draft", async () => {
    // arrange
    const { save, sync } = startSync(["refused"]);

    // act
    sync.queue(draftWithWeight(66));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + RETRY_INTERVAL_MS * 2);
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(0);

    // assert
    expect(save).toHaveBeenCalledTimes(1);
    expect(bufferedEntry()).toBeNull();
  });

  it("drops the queued save once her answers are being sent", async () => {
    // arrange
    const { save, sync } = startSync([]);
    sync.queue(draftWithWeight(66));

    // act
    sync.stopSaving();
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    // assert
    expect(save).not.toHaveBeenCalled();
  });
});

describe("createDraftSync with a unit choice", () => {
  it("saves her unit choice straight away", async () => {
    // arrange
    const { saveUnitPreference, states, sync } = startSyncAnswering({});

    // act
    sync.queueUnitPreference(IMPERIAL);
    await vi.advanceTimersByTimeAsync(0);

    // assert
    expect(saveUnitPreference).toHaveBeenCalledExactlyOnceWith(IMPERIAL);
    expect(states).toEqual(["saving", "saved"]);
  });

  it("keeps an unsaved unit choice on the device and says it is not saved yet", async () => {
    // arrange
    const { states, sync } = startSyncAnswering({
      unitPreferences: ["failed"],
    });

    // act
    sync.queueUnitPreference(IMPERIAL);
    await vi.advanceTimersByTimeAsync(0);

    // assert
    expect(states.at(-1)).toBe("unsaved");
    expect(bufferedEntry()).toEqual({ unitPreference: IMPERIAL });
  });

  it("keeps the unit choice unsent even once her draft is saved", async () => {
    // arrange
    const { states, sync } = startSyncAnswering({
      unitPreferences: ["failed", "failed"],
    });
    sync.queueUnitPreference(IMPERIAL);
    await vi.advanceTimersByTimeAsync(0);

    // act
    sync.queue(draftWithWeight(66));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    // assert
    expect(states.at(-1)).toBe("unsaved");
    expect(bufferedEntry()).toEqual({ unitPreference: IMPERIAL });
  });

  it("sends the unsent unit choice again with her next change", async () => {
    // arrange
    const { save, saveUnitPreference, states, sync } = startSyncAnswering({
      unitPreferences: ["failed", "saved"],
    });
    sync.queueUnitPreference(IMPERIAL);
    await vi.advanceTimersByTimeAsync(0);

    // act
    sync.queue(draftWithWeight(66));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    // assert
    expect(saveUnitPreference).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledExactlyOnceWith(draftWithWeight(66));
    expect(states.at(-1)).toBe("saved");
    expect(bufferedEntry()).toBeNull();
  });

  it("tries the unsent unit choice again once the browser is back online", async () => {
    // arrange
    const { saveUnitPreference, states, sync } = startSyncAnswering({
      unitPreferences: ["failed", "saved"],
    });
    sync.queueUnitPreference(IMPERIAL);
    await vi.advanceTimersByTimeAsync(0);

    // act
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(0);

    // assert
    expect(saveUnitPreference).toHaveBeenCalledTimes(2);
    expect(states.at(-1)).toBe("saved");
    expect(bufferedEntry()).toBeNull();
  });

  it("tries the unsent unit choice and draft together every fifteen seconds", async () => {
    // arrange
    const { save, saveUnitPreference, states, sync } = startSyncAnswering({
      drafts: ["failed"],
      unitPreferences: ["failed"],
    });
    sync.queue(draftWithWeight(66));
    sync.queueUnitPreference(IMPERIAL);
    await vi.advanceTimersByTimeAsync(0);
    const unsentEntry = bufferedEntry();

    // act
    await vi.advanceTimersByTimeAsync(RETRY_INTERVAL_MS);

    // assert
    expect(unsentEntry).toEqual({
      draft: draftWithWeight(66),
      editedAt: NOW.toISOString(),
      unitPreference: IMPERIAL,
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(saveUnitPreference).toHaveBeenCalledTimes(2);
    expect(states.at(-1)).toBe("saved");
    expect(bufferedEntry()).toBeNull();
  });

  it("resends the unit choice this device could not send", async () => {
    // arrange
    const { saveUnitPreference, states, sync } = startSyncAnswering({});

    // act
    sync.resend({ draft: null, unitPreference: IMPERIAL });
    await vi.advanceTimersByTimeAsync(0);

    // assert
    expect(saveUnitPreference).toHaveBeenCalledExactlyOnceWith(IMPERIAL);
    expect(states.at(-1)).toBe("saved");
  });

  it("keeps the unsent unit choice on the device once her answers are being sent", async () => {
    // arrange
    const { sync } = startSyncAnswering({
      drafts: ["failed"],
      unitPreferences: ["failed"],
    });
    sync.queue(draftWithWeight(66));
    sync.queueUnitPreference(IMPERIAL);
    await vi.advanceTimersByTimeAsync(0);

    // act
    sync.stopSaving();
    sync.discardUnsentDraft();

    // assert
    expect(bufferedEntry()).toEqual({ unitPreference: IMPERIAL });
  });
});

describe("readUnsentEdits", () => {
  it("hands back an unsent draft edited after the server's draft", () => {
    // arrange
    const entry = {
      draft: draftWithWeight(66),
      editedAt: "2026-09-28T09:00:00.000Z",
    };
    window.localStorage.setItem(PENDING_DRAFT_KEY, JSON.stringify(entry));

    // act
    const pending = readUnsentEdits({
      clientId: CLIENT_ID,
      serverUpdatedAt: "2026-09-28T08:00:00.000Z",
    });

    // assert
    expect(pending).toEqual({ draft: entry, unitPreference: null });
  });

  it("hands back an unsent draft when the server holds no draft yet", () => {
    // arrange
    const entry = {
      draft: draftWithWeight(66),
      editedAt: "2026-09-28T09:00:00.000Z",
    };
    window.localStorage.setItem(PENDING_DRAFT_KEY, JSON.stringify(entry));

    // act
    const pending = readUnsentEdits({
      clientId: CLIENT_ID,
      serverUpdatedAt: null,
    });

    // assert
    expect(pending).toEqual({ draft: entry, unitPreference: null });
  });

  it("discards an unsent draft older than the server's draft", () => {
    // arrange
    window.localStorage.setItem(
      PENDING_DRAFT_KEY,
      JSON.stringify({
        draft: draftWithWeight(66),
        editedAt: "2026-09-28T07:00:00.000Z",
      }),
    );

    // act
    const pending = readUnsentEdits({
      clientId: CLIENT_ID,
      serverUpdatedAt: "2026-09-28T08:00:00.000Z",
    });

    // assert
    expect(pending).toBeNull();
    expect(bufferedEntry()).toBeNull();
  });

  it("hands back an unsent unit choice while leaving out an older draft", () => {
    // arrange
    window.localStorage.setItem(
      PENDING_DRAFT_KEY,
      JSON.stringify({
        draft: draftWithWeight(66),
        editedAt: "2026-09-28T07:00:00.000Z",
        unitPreference: IMPERIAL,
      }),
    );

    // act
    const pending = readUnsentEdits({
      clientId: CLIENT_ID,
      serverUpdatedAt: "2026-09-28T08:00:00.000Z",
    });

    // assert
    expect(pending).toEqual({ draft: null, unitPreference: IMPERIAL });
  });

  it.each([
    ["text that is not JSON", "{not json"],
    [
      "a draft of the wrong shape",
      JSON.stringify({
        draft: { formId: "training-history" },
        editedAt: "2026-09-28T09:00:00.000Z",
      }),
    ],
    [
      "a unit choice of the wrong shape",
      JSON.stringify({ unitPreference: { weightUnit: "stone" } }),
    ],
    [
      "a unit choice beside a draft of the wrong shape",
      JSON.stringify({
        draft: { formId: "training-history" },
        editedAt: "2026-09-28T09:00:00.000Z",
        unitPreference: { weightUnit: "lb", heightUnit: "ft-in" },
      }),
    ],
  ])("discards %s", (_label, raw) => {
    // arrange
    window.localStorage.setItem(PENDING_DRAFT_KEY, raw);

    // act
    const pending = readUnsentEdits({
      clientId: CLIENT_ID,
      serverUpdatedAt: "2026-09-28T08:00:00.000Z",
    });

    // assert
    expect(pending).toBeNull();
    expect(bufferedEntry()).toBeNull();
  });
});
