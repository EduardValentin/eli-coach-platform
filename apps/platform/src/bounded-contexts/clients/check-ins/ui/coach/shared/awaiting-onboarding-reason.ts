import type { VisitorGender } from "~/bounded-contexts/scheduling/public/visitor";

import {
  possessivePronoun,
  subjectPronoun,
} from "~/bounded-contexts/scheduling/assessment-calls/ui/shared/visitor-profile-display";

export function awaitingOnboardingReason(gender: VisitorGender): string {
  const subject = subjectPronoun(gender);

  return `${subject.capitalised} can answer a check-in once ${subject.lower} ${subject.hasVerb} sent ${possessivePronoun(gender).lower} onboarding.`;
}
