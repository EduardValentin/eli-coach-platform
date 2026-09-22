import { TriangleAlert } from 'lucide-react';
import type { ReviewAnswer } from '../../domain/onboardingAnswers';

export const NEEDS_A_LOOK_LABEL = 'Needs a look';

export function ReviewAnswerValue({ answer }: { answer: ReviewAnswer }) {
  if (answer.answer === null) {
    return <span className="text-copy-muted">Not answered</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {answer.answer}
      {answer.flagged && (
        <TriangleAlert
          aria-label={NEEDS_A_LOOK_LABEL}
          className="shrink-0 text-destructive"
          size={14}
        />
      )}
    </span>
  );
}
