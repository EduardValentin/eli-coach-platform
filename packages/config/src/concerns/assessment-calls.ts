import { z } from "zod";

export const assessmentCallsShape = {
  ASSESSMENT_CALL_MEETING_LINK: z
    .url()
    .default("https://example.invalid/2f8b41c6a9d7"),
  ASSESSMENT_CALL_COACH_EMAIL: z
    .email()
    .default("4e1c7a93b5d2@example.invalid"),
};

export type AssessmentCallsConfig = z.infer<
  z.ZodObject<typeof assessmentCallsShape>
>;
