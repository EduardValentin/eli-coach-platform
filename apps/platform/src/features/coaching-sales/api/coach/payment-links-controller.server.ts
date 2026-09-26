import type { SendPaymentLinkUseCase } from "@eli-coach-platform/domain/payment-link";
import type { ActionFunctionArgs } from "react-router";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import {
  sendPaymentLinkErrorSchema,
  sendPaymentLinkRequestSchema,
  sendPaymentLinkSuccessSchema,
} from "~/features/coaching-sales/contracts/coaching-sales";

type PaymentLinksControllerOptions = {
  sendPaymentLink: SendPaymentLinkUseCase;
};

type SendPaymentLinkRefusal = Exclude<
  Awaited<ReturnType<SendPaymentLinkUseCase["execute"]>>["status"],
  "sent"
>;

const REFUSAL_STATUS = {
  already_paid: 409,
  call_not_ended: 409,
  call_not_found: 404,
  closed: 404,
  delivery_failed: 502,
} as const satisfies Record<SendPaymentLinkRefusal, number>;

export class PaymentLinksController {
  constructor(private readonly options: PaymentLinksControllerOptions) {}

  async sendPaymentLink(args: ActionFunctionArgs): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });

    const body: unknown = await args.request.json().catch(() => null);
    const submission = sendPaymentLinkRequestSchema.safeParse(body);

    if (!submission.success) {
      return errorResponse({ error: "invalid_request", status: 400 });
    }

    const result = await this.options.sendPaymentLink.execute(submission.data);

    if (result.status === "sent") {
      return Response.json(sendPaymentLinkSuccessSchema.parse(result));
    }

    return errorResponse({
      error: result.status,
      status: REFUSAL_STATUS[result.status],
    });
  }
}

function errorResponse(refusal: { error: string; status: number }): Response {
  return Response.json(
    sendPaymentLinkErrorSchema.parse({ error: refusal.error }),
    { status: refusal.status },
  );
}
