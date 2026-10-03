import { CreditCard } from "lucide-react";

import { ManagePaymentMethodButton } from "~/features/coaching-sales/ui/client/payment-method/manage-payment-method-button";
import { MANAGE_PAYMENT_METHOD_LABEL } from "~/features/coaching-sales/ui/client/payment-method/payment-method-copy";
import { PaymentMethodProblems } from "~/features/coaching-sales/ui/client/payment-method/payment-method-problems";

const PAYMENT_PROBLEM = ["payment-problem"] as const;

export function PaymentProblemNoticeLine() {
  return (
    <PaymentMethodProblems className="mt-4 max-w-2xl" shown={PAYMENT_PROBLEM} />
  );
}

export function PaymentProblemNoticeAction() {
  return (
    <ManagePaymentMethodButton
      icon={<CreditCard aria-hidden="true" size={16} />}
      label={MANAGE_PAYMENT_METHOD_LABEL}
      width="full-below-sm"
    />
  );
}
