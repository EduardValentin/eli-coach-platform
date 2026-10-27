import type { VisitorGender } from "~/bounded-contexts/scheduling/public/visitor";

import {
  possessivePronoun,
  subjectPronoun,
} from "~/bounded-contexts/scheduling/assessment-calls/public/visitor-profile";

export function awaitingOnboardingReason(gender: VisitorGender): string {
  const subject = subjectPronoun(gender);

  return `${subject.capitalised} can answer a check-in once ${subject.lower} ${subject.hasVerb} sent ${possessivePronoun(gender).lower} onboarding.`;
}
