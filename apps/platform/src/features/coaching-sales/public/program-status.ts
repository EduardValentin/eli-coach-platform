import { STEPS_AFTER_SUBMISSION } from "@eli-coach-platform/domain/client-journey";
import { z } from "zod";

export type ProgramStatusKind = (typeof STEPS_AFTER_SUBMISSION)[number];

export const programStatusSchema = z.object({
  kind: z.enum(STEPS_AFTER_SUBMISSION),
  submittedAt: z.iso.datetime(),
  workStartsOn: z.iso.datetime().nullable(),
  startNowUntil: z.iso.datetime().nullable(),
});

export type ProgramStatus = z.infer<typeof programStatusSchema>;
