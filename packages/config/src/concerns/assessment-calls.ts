import { z } from "zod";

import { isProductionRuntime, type AppConfig } from "./app";

const PLACEHOLDER_MEETING_LINK = "https://meet.google.com/mock-eli-assessment";

export const assessmentCallsShape = {
  ASSESSMENT_CALL_MEETING_LINK: z.url().default(PLACEHOLDER_MEETING_LINK),
  ASSESSMENT_CALL_COACH_EMAIL: z.email().default("eli.lungu04@gmail.com"),
};

export type AssessmentCallsConfig = z.infer<
  z.ZodObject<typeof assessmentCallsShape>
>;

export function refineAssessmentCalls(
  environment: AssessmentCallsConfig & AppConfig,
  context: z.RefinementCtx,
): void {
  if (
    !isProductionRuntime(environment) ||
    environment.ASSESSMENT_CALL_MEETING_LINK !== PLACEHOLDER_MEETING_LINK
  ) {
    return;
  }

  context.addIssue({
    code: "custom",
    message:
      "Production assessment calls require a real ASSESSMENT_CALL_MEETING_LINK.",
    path: ["ASSESSMENT_CALL_MEETING_LINK"],
  });
}
