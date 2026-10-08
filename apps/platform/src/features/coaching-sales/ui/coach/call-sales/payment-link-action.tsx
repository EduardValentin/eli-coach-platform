import { RowActionButton } from "@eli-coach-platform/ui/appointments";
import { ConfirmDialog } from "@eli-coach-platform/ui/overlays";
import { Send } from "lucide-react";

import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";

import { possessivePronoun } from "~/features/assessment-calls/public/visitor-profile";
import {
  PAYMENT_LINK_MESSAGES,
  sendPaymentLinkErrorSchema,
  sendPaymentLinkSuccessSchema,
  type CallSalesState,
} from "~/features/coaching-sales/public/coaching-sales";
import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/public/paths";
import { useConfirmedJsonAction } from "~/features/coaching-sales/ui/coach/use-confirmed-json-action";

type PaymentLinkCall = {
  fullName: string;
  gender: VisitorGender;
  id: string;
  visitorEmail: string;
};

type PaymentLinkActionProps = {
  call: PaymentLinkCall;
  state: CallSalesState;
};

type SendingCopy = {
  buttonLabel: string;
  confirmLabel: string;
  description: string;
  title: string;
};

function sendingCopy(
  state: Exclude<CallSalesState, "paid">,
  call: PaymentLinkCall,
): SendingCopy {
  const pronoun = possessivePronoun(call.gender);

  if (state === "held") {
    return {
      buttonLabel: "Send payment link",
      confirmLabel: "Send link",
      description: `${call.fullName} gets an email with a link to choose ${pronoun.lower} bundle and pay.`,
      title: "Send payment link?",
    };
  }

  return {
    buttonLabel: "Re-send payment link",
    confirmLabel: "Re-send link",
    description: `A fresh link goes to ${call.visitorEmail}. ${pronoun.capitalised} earlier link stops working.`,
    title: "Re-send payment link?",
  };
}

export function PaymentLinkAction({ call, state }: PaymentLinkActionProps) {
  const { askToConfirm, confirmDialog, isSending } = useConfirmedJsonAction({
    action: COACHING_SALES_API_PATHS.paymentLinks,
    body: { assessmentCallId: call.id },
    failureMessage: paymentLinkFailureMessage,
    sentMessage: (sent) => PAYMENT_LINK_MESSAGES.sent(sent.email),
    sentSchema: sendPaymentLinkSuccessSchema,
  });

  if (state === "paid") {
    return null;
  }

  const copy = sendingCopy(state, call);

  return (
    <div
      className="flex w-full flex-wrap items-center gap-2 md:w-auto"
      data-parity-root="CallJourneyActions"
    >
      <RowActionButton
        busy={isSending}
        className="w-full md:w-auto"
        data-parity="payment-link-action"
        icon={Send}
        onClick={askToConfirm}
      >
        {copy.buttonLabel}
      </RowActionButton>

      <ConfirmDialog
        {...confirmDialog}
        confirmLabel={copy.confirmLabel}
        description={copy.description}
        title={copy.title}
      />
    </div>
  );
}

function paymentLinkFailureMessage(sendResponse: unknown): string {
  const refusal = sendPaymentLinkErrorSchema.safeParse(sendResponse);

  if (refusal.data?.error === "delivery_failed") {
    return PAYMENT_LINK_MESSAGES.deliveryFailed;
  }

  return PAYMENT_LINK_MESSAGES.unavailable;
}
