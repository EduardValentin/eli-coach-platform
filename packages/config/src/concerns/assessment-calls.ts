import { z } from "zod";

export const assessmentCallsShape = {
  ASSESSMENT_CALL_COACH_EMAIL: z
    .email()
    .default("4e1c7a93b5d2@example.invalid"),
};

export type AssessmentCallsConfig = z.infer<
  z.ZodObject<typeof assessmentCallsShape>
>;
