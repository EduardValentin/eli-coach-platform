import { CreditCard } from 'lucide-react';
import { Button } from '../ui/button';
import {
  CHANGE_PAYMENT_METHOD_LABEL,
  OPENING_PAYMENT_METHOD_LABEL,
} from '../../utils/subscriptionCopy';

export function ChangePaymentMethodButton({
  opening,
  onOpen,
}: {
  opening: boolean;
  onOpen: () => void;
}) {
  return (
    <Button
      aria-busy={opening}
      className="w-full sm:w-auto"
      data-parity="manage-payment-method"
      disabled={opening}
      onClick={onOpen}
      size="sm"
      type="button"
      variant="outline"
    >
      <CreditCard aria-hidden="true" />
      {opening ? OPENING_PAYMENT_METHOD_LABEL : CHANGE_PAYMENT_METHOD_LABEL}
    </Button>
  );
}
