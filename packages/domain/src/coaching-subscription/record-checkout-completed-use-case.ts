import { Client } from "../client";
import type {
  AssessmentCallReader,
  CoachingSalesIncidents,
} from "../payment-link";
import type { Clock } from "../shared";

import type { CoachingPurchases } from "./coaching-purchases";
import {
  CoachingSubscription,
  type CheckoutCompletion,
} from "./coaching-subscription";
import type { PaidClientAdmission } from "./paid-client-admission";

type RecordCheckoutCompletedResult =
  | { status: "recorded" }
  | { status: "duplicate" }
  | { status: "already_paid" }
  | { status: "call_not_found" };

type RecordCheckoutCompletedUseCaseOptions = {
  admission: PaidClientAdmission;
  calls: AssessmentCallReader;
  clock: Clock;
  incidents: CoachingSalesIncidents;
  purchases: CoachingPurchases;
};

const STATUS_BY_PURCHASE_OUTCOME = {
  recorded: "recorded",
  duplicate_event: "duplicate",
} as const;

export class RecordCheckoutCompletedUseCase {
  constructor(
    private readonly options: RecordCheckoutCompletedUseCaseOptions,
  ) {}

  async execute(
    completion: CheckoutCompletion & { eventId: string },
  ): Promise<RecordCheckoutCompletedResult> {
    const call = await this.options.calls.findById(completion.assessmentCallId);

    if (!call) {
      this.options.incidents.paymentEventRejected({
        eventId: completion.eventId,
        reason: "call_not_found",
      });

      return { status: "call_not_found" };
    }

    const purchase = await this.options.purchases.recordCompletion({
      eventId: completion.eventId,
      client: Client.fromAssessmentCall(call, this.options.clock.now()),
      subscription: CoachingSubscription.fromCompletedCheckout(completion),
    });

    if (purchase.outcome === "call_already_paid") {
      this.options.incidents.paymentEventRejected({
        eventId: completion.eventId,
        reason: "call_already_paid",
      });

      return { status: "already_paid" };
    }

    await this.options.admission.admit({ clientId: purchase.clientId });

    return { status: STATUS_BY_PURCHASE_OUTCOME[purchase.outcome] };
  }
}
