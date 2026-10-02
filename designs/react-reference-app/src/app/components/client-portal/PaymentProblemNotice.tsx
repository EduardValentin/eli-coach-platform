import { Alert } from '../ui/alert';
import {
  PAYMENT_PROBLEM_LINE,
  PAYMENT_PROBLEM_TITLE,
} from '../../utils/subscriptionCopy';

export function PaymentProblemNotice() {
  return (
    <Alert role="status" data-parity="payment-problem">
      <p className="font-semibold">{PAYMENT_PROBLEM_TITLE}</p>
      <p className="mt-0.5 font-normal">{PAYMENT_PROBLEM_LINE}</p>
    </Alert>
  );
}
