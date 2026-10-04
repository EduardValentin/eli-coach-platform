import { Button } from "@eli-coach-platform/ui/primitives";
import type { ComponentProps } from "react";

import {
  CHANGE_PAYMENT_METHOD_LABEL,
  OPENING_PAYMENT_METHOD_LABEL,
} from "./payment-method-copy";
import { PaymentMethodForm } from "./payment-method-form";

type ChangePaymentMethodButtonProps = Pick<
  ComponentProps<typeof Button>,
  "aria-describedby" | "className"
>;

export function ChangePaymentMethodButton(
  placement: ChangePaymentMethodButtonProps,
) {
  return (
    <PaymentMethodForm>
      {({ opening }) => (
        <Button
          aria-busy={opening}
          data-parity="manage-payment-method"
          disabled={opening}
          size="sm"
          type="submit"
          variant="outline"
          {...placement}
        >
          {opening ? OPENING_PAYMENT_METHOD_LABEL : CHANGE_PAYMENT_METHOD_LABEL}
        </Button>
      )}
    </PaymentMethodForm>
  );
}
