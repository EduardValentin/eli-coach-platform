import { RowActionButton } from "@eli-coach-platform/ui/appointments";
import { ConfirmDialog } from "@eli-coach-platform/ui/overlays";
import { toast } from "@eli-coach-platform/ui/toast";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";

import { possessivePronoun } from "~/features/assessment-calls/contracts/visitor-profile";
import {
  PAYMENT_LINK_MESSAGES,
  sendPaymentLinkErrorSchema,
  sendPaymentLinkSuccessSchema,
  type CallSalesState,
} from "~/features/coaching-sales/contracts/coaching-sales";
import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/contracts/paths";

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
  const [confirming, setConfirming] = useState(false);
  const { isSending, send } = usePaymentLinkSender(call.id);

  if (state === "paid") {
    return null;
  }

  const copy = sendingCopy(state, call);

  const confirm = () => {
    setConfirming(false);
    send();
  };

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
        onClick={() => setConfirming(true)}
      >
        {copy.buttonLabel}
      </RowActionButton>

      <ConfirmDialog
        confirmLabel={copy.confirmLabel}
        description={copy.description}
        onConfirm={confirm}
        onOpenChange={setConfirming}
        open={confirming}
        title={copy.title}
      />
    </div>
  );
}

function usePaymentLinkSender(assessmentCallId: string) {
  const fetcher = useFetcher<unknown>();
  const { data, state, submit } = fetcher;
  const isSending = state !== "idle";

  useEffect(() => {
    if (data === undefined) {
      return;
    }

    const sent = sendPaymentLinkSuccessSchema.safeParse(data);

    if (sent.success) {
      toast.success(PAYMENT_LINK_MESSAGES.sent(sent.data.email));
      return;
    }

    toast.error(paymentLinkFailureMessage(data));
  }, [data]);

  const send = () => {
    void submit(
      { assessmentCallId },
      {
        action: COACHING_SALES_API_PATHS.paymentLinks,
        encType: "application/json",
        method: "post",
      },
    );
  };

  return { isSending, send };
}

function paymentLinkFailureMessage(sendResponse: unknown): string {
  const refusal = sendPaymentLinkErrorSchema.safeParse(sendResponse);

  if (refusal.data?.error === "delivery_failed") {
    return PAYMENT_LINK_MESSAGES.deliveryFailed;
  }

  return PAYMENT_LINK_MESSAGES.unavailable;
}
