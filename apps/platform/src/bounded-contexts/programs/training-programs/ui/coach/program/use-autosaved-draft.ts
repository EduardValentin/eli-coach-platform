import { useEffect, useRef, useState } from "react";
import { useRevalidator } from "react-router";

import type {
  ClientLevel,
  ProgramContent,
  ProgramLanguage,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { useEditorAnnouncer } from "./editor-announcer";
import {
  saveProgramDraft,
  type DraftSaveAnswer,
} from "./program-draft-save-requests";

const SAVE_DELAY_MS = 800;
const SAVE_RETRY_INTERVAL_MS = 15_000;

export type BuilderDraft = {
  content: ProgramContent;
  level: ClientLevel;
  language: ProgramLanguage;
};

export type StoredDraft = BuilderDraft & {
  clientId: string;
  updatedAt: string;
};

export type SaveState =
  "unchanged" | "saving" | "saved" | "not-saved" | "changed-elsewhere";

export type SaveResult = DraftSaveAnswer["status"];

export type DraftSaving = {
  state: SaveState;
  failing: boolean;
  retrying: boolean;
  retryNow: () => void;
  saveNow: () => Promise<SaveResult>;
  reload: () => void;
};

type DraftChange = (draft: BuilderDraft) => BuilderDraft;

export function hasUnsentChanges(state: SaveState): boolean {
  return state === "saving" || state === "not-saved";
}

function draftOf({ content, level, language }: StoredDraft): BuilderDraft {
  return { content, level, language };
}

export function useAutosavedDraft(stored: StoredDraft) {
  const announce = useEditorAnnouncer();
  const revalidator = useRevalidator();
  const [draft, setDraft] = useState(() => draftOf(stored));
  const [state, setState] = useState<SaveState>("unchanged");
  const [failing, setFailing] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const latestStored = useRef(stored);
  latestStored.current = stored;
  const awaitingReload = useRef(false);
  const latestDraft = useRef(draft);
  const expectedUpdatedAt = useRef(stored.updatedAt);
  const edits = useRef({ made: 0, saved: 0 });
  const failingNow = useRef(false);
  const changedElsewhere = useRef(false);
  const queuedSave = useRef<number | null>(null);
  const inFlight = useRef<Promise<SaveResult> | null>(null);
  const left = useRef(false);

  function cancelQueuedSave() {
    if (queuedSave.current !== null) window.clearTimeout(queuedSave.current);
    queuedSave.current = null;
  }

  function startFailing() {
    failingNow.current = true;
    setFailing(true);
  }

  function stopFailing() {
    failingNow.current = false;
    setFailing(false);
  }

  function show(next: BuilderDraft) {
    latestDraft.current = next;
    setDraft(next);
  }

  function applyAnswer(answer: DraftSaveAnswer, sentAtEdit: number) {
    if (answer.status === "changed-elsewhere") {
      changedElsewhere.current = true;
      cancelQueuedSave();
      stopFailing();
      setState("changed-elsewhere");
      return;
    }
    if (answer.status === "not-saved") {
      startFailing();
      if (queuedSave.current === null) setState("not-saved");
      return;
    }
    expectedUpdatedAt.current = answer.updatedAt;
    edits.current.saved = sentAtEdit;
    if (failingNow.current) {
      stopFailing();
      announce("All changes saved.");
    }
    if (sentAtEdit === edits.current.made) setState("saved");
  }

  async function send(): Promise<SaveResult> {
    const sentAtEdit = edits.current.made;
    setState("saving");
    const pending = saveProgramDraft(latestStored.current.clientId, {
      ...latestDraft.current,
      updatedAt: expectedUpdatedAt.current,
    });
    inFlight.current = pending.then((answer) => answer.status);
    const answer = await pending;
    inFlight.current = null;
    if (!left.current) applyAnswer(answer, sentAtEdit);

    return answer.status;
  }

  async function saveNow(): Promise<SaveResult> {
    cancelQueuedSave();
    while (inFlight.current) await inFlight.current;
    if (changedElsewhere.current) return "changed-elsewhere";
    if (edits.current.saved === edits.current.made) return "saved";

    return send();
  }

  function change(update: DraftChange) {
    if (changedElsewhere.current) return;
    show(update(latestDraft.current));
    edits.current.made += 1;
    setState("saving");
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
    if (result === "not-saved") announce("Still not saved.");
  }

  function reload() {
    awaitingReload.current = true;
    void revalidator.revalidate();
  }

  useEffect(() => {
    if (!awaitingReload.current) return;
    awaitingReload.current = false;
    expectedUpdatedAt.current = stored.updatedAt;
    edits.current = { made: 0, saved: 0 };
    changedElsewhere.current = false;
    show(draftOf(stored));
    setState("unchanged");
  }, [stored.content, stored.updatedAt]);

  useEffect(() => {
    if (!failing) return;
    const retry = () => void saveNow();
    const retryTimer = window.setInterval(retry, SAVE_RETRY_INTERVAL_MS);
    window.addEventListener("online", retry);

    return () => {
      window.clearInterval(retryTimer);
      window.removeEventListener("online", retry);
    };
    // saveNow reads only refs and stable setters, so the one from the render
    // that started failing stays correct.
  }, [failing]);

  // Leaving with a change still queued sends it rather than dropping it. Its
  // answer arrives after the builder is gone, so nothing on screen is updated.
  useEffect(
    () => () => {
      left.current = true;
      if (queuedSave.current !== null) void saveNow();
    },
    [],
  );

  const saving: DraftSaving = {
    state,
    failing,
    retrying,
    retryNow: () => void retryNow(),
    saveNow,
    reload,
  };

  return { draft, change, saving };
}
