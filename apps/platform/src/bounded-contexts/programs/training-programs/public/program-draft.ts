import {
  CLIENT_LEVELS,
  PROGRAM_LANGUAGES,
  type ClientGender,
  type ClientLevel,
  type ProgramContent,
  type ProgramLanguage,
} from "~/bounded-contexts/programs/training-programs/domain/program";
import { z } from "zod";

import { programContentSchema } from "~/bounded-contexts/programs/training-programs/public/program-content-schema";

export const programDraftSaveRequestSchema = z.strictObject({
  content: programContentSchema,
  level: z.enum(CLIENT_LEVELS),
  language: z.enum(PROGRAM_LANGUAGES),
  updatedAt: z.iso.datetime(),
});

export const programDraftSavedAnswerSchema = z.strictObject({
  status: z.literal("saved"),
  updatedAt: z.iso.datetime(),
});

export const programDraftRefusalSchema = z.strictObject({
  error: z.enum(["changed-elsewhere", "not-a-draft", "no-program"]),
});

type ProgramDraftClient = {
  clientId: string;
  firstName: string;
  lastName: string;
  gender: ClientGender;
};

export type ProgramDraftView =
  | { state: "no-program"; client: ProgramDraftClient }
  | {
      state: "draft";
      client: ProgramDraftClient;
      coachingEnded: boolean;
      level: ClientLevel;
      language: ProgramLanguage;
      versionNumber: number;
      content: ProgramContent;
      updatedAt: string;
    };
