import { Button } from "@eli-coach-platform/ui/primitives";
import type { ComponentProps, ReactNode } from "react";

import { OPENING_PAYMENT_METHOD_LABEL } from "./payment-method-copy";
import { PaymentMethodForm } from "./payment-method-form";

type ManagePaymentMethodButtonProps = Pick<
  ComponentProps<typeof Button>,
  "aria-describedby" | "className" | "width"
> & {
  icon?: ReactNode;
  label: string;
};

export function ManagePaymentMethodButton({
  icon,
  label,
  ...placement
}: ManagePaymentMethodButtonProps) {
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
          {icon}
          {opening ? OPENING_PAYMENT_METHOD_LABEL : label}
        </Button>
      )}
    </PaymentMethodForm>
  );
}
