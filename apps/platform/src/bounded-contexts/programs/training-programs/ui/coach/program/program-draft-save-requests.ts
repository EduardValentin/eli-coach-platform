import { appUrl } from "~/shared/http/base-path";
import { programDraftSavePath } from "~/bounded-contexts/programs/training-programs/public/paths";
import {
  programDraftRefusalSchema,
  programDraftSavedAnswerSchema,
} from "~/bounded-contexts/programs/training-programs/public/program-draft";
import type {
  ClientLevel,
  ProgramContent,
  ProgramLanguage,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

export type ProgramDraftSaveRequest = {
  content: ProgramContent;
  level: ClientLevel;
  language: ProgramLanguage;
  updatedAt: string;
};

export type DraftSaveAnswer =
  | { status: "saved"; updatedAt: string }
  | { status: "changed-elsewhere" }
  | { status: "not-saved" };

const NOT_SAVED: DraftSaveAnswer = { status: "not-saved" };

async function answerOf(response: Response): Promise<DraftSaveAnswer> {
  const body: unknown = await response.json().catch(() => null);
  const saved = programDraftSavedAnswerSchema.safeParse(body);
  if (response.ok && saved.success) return saved.data;

  return programDraftRefusalSchema.safeParse(body).success &&
    response.status === 409
    ? { status: "changed-elsewhere" }
    : NOT_SAVED;
}

// A save the server refuses as a conflict means a newer draft exists, so the
// builder can only reload; a redirect (a signed-out session) is a failed save.
export async function saveProgramDraft(
  clientId: string,
  request: ProgramDraftSaveRequest,
): Promise<DraftSaveAnswer> {
  try {
    const response = await fetch(appUrl(programDraftSavePath(clientId)), {
      body: JSON.stringify(request),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
      redirect: "manual",
    });

    return await answerOf(response);
  } catch {
    return NOT_SAVED;
  }
}
