import { TriangleAlert } from "lucide-react";

import type { ReviewAnswer } from "~/features/client-onboarding/contracts/onboarding-review";
import {
  NEEDS_A_LOOK,
  NOT_ANSWERED,
} from "~/features/client-onboarding/contracts/onboarding-review-copy";

type ReviewAnswerValueProps = {
  answer: ReviewAnswer;
};

export function ReviewAnswerValue({ answer }: ReviewAnswerValueProps) {
  if (answer.value === null) {
    return <span className="text-copy-muted">{NOT_ANSWERED}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {answer.value}
      {answer.flagged ? (
        <TriangleAlert
          aria-label={NEEDS_A_LOOK}
          className="shrink-0 text-feedback-danger"
          role="img"
          size={14}
        />
      ) : null}
    </span>
  );
}
