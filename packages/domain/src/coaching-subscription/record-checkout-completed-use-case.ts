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

type RecordCheckoutCompletedResult =
  | { status: "recorded" }
  | { status: "duplicate" }
  | { status: "already_paid" }
  | { status: "call_not_found" };

type RecordCheckoutCompletedUseCaseOptions = {
  calls: AssessmentCallReader;
  clock: Clock;
  incidents: CoachingSalesIncidents;
  purchases: CoachingPurchases;
};

const STATUS_BY_PURCHASE_OUTCOME = {
  recorded: "recorded",
  duplicate_event: "duplicate",
  call_already_paid: "already_paid",
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

    const outcome = await this.options.purchases.recordCompletion({
      eventId: completion.eventId,
      client: Client.fromAssessmentCall(call, this.options.clock.now()),
      subscription: CoachingSubscription.fromCompletedCheckout(completion),
    });

    if (outcome === "call_already_paid") {
      this.options.incidents.paymentEventRejected({
        eventId: completion.eventId,
        reason: "call_already_paid",
      });
    }

    return { status: STATUS_BY_PURCHASE_OUTCOME[outcome] };
  }
}
