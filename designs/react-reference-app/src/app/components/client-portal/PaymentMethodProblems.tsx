import type { CoachingSubscription } from '../../domain/coachingSubscription';
import { PAYMENT_PROBLEM_LINE } from '../../utils/subscriptionCopy';
import { InlineProblem } from '../InlineProblem';

type ProblemLineAttributes = { id?: string };

type PaymentMethodProblemsProps = {
  subscription: CoachingSubscription | undefined;
  handOffProblem: string | null;
  lineAttributes?: {
    paymentProblem?: ProblemLineAttributes;
    handOffProblem?: ProblemLineAttributes;
  };
};

export function PaymentMethodProblems({
  subscription,
  handOffProblem,
  lineAttributes = {},
}: PaymentMethodProblemsProps) {
  return (
    <>
      {subscription?.paymentProblem && (
        <InlineProblem
          {...lineAttributes.paymentProblem}
          data-parity="payment-problem"
          role="status"
        >
          {PAYMENT_PROBLEM_LINE}
        </InlineProblem>
      )}
      {handOffProblem && (
        <InlineProblem
          {...lineAttributes.handOffProblem}
          data-parity="payment-method-problem"
          role="alert"
        >
          {handOffProblem}
        </InlineProblem>
      )}
    </>
  );
}
