import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";

import {
  possessivePronoun,
  subjectPronoun,
} from "~/bounded-contexts/scheduling/assessment-calls/public/visitor-profile";

export function awaitingOnboardingReason(gender: VisitorGender): string {
  const subject = subjectPronoun(gender);

  return `${subject.capitalised} can answer a check-in once ${subject.lower} ${subject.hasVerb} sent ${possessivePronoun(gender).lower} onboarding.`;
}
