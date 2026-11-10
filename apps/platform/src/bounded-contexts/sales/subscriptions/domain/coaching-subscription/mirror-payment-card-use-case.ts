import type { CoachingSubscriptionIncidentsPort } from "./coaching-subscription-incidents-port";
import type { CoachingSubscriptionsPort } from "./coaching-subscriptions-port";
import { PaymentCard, type PaymentCardEvent } from "./payment-card";
import type { PaymentCardsPort } from "./payment-cards-port";

type MirrorPaymentCardCommand = {
  eventId: string;
  event: PaymentCardEvent;
};

type MirrorPaymentCardResult = {
  status: "recorded" | "duplicate" | "ignored";
};

type MirrorPaymentCardUseCaseOptions = {
  paymentCardsPort: PaymentCardsPort;
  coachingSubscriptionIncidentsPort: CoachingSubscriptionIncidentsPort;
  coachingSubscriptionsPort: CoachingSubscriptionsPort;
};

export class MirrorPaymentCardUseCase {
  constructor(private readonly options: MirrorPaymentCardUseCaseOptions) {}

  async execute(
    command: MirrorPaymentCardCommand,
  ): Promise<MirrorPaymentCardResult> {
    const first = await this.attempt(command);
    const result = first === "stale" ? await this.attempt(command) : first;

    if (result === "stale") {
      throw new Error(
        `Payment event ${command.eventId} met a card on file that kept changing.`,
      );
    }

    return result;
  }

  private async attempt(
    command: MirrorPaymentCardCommand,
  ): Promise<MirrorPaymentCardResult | "stale"> {
    const { event, eventId } = command;
    const { paymentCustomerId } = event;
    const incident = { eventId, eventKind: event.kind, paymentCustomerId };
    const subscription =
      await this.options.coachingSubscriptionsPort.findCurrentByPaymentCustomerId(
        paymentCustomerId,
      );

    if (!subscription) {
      this.options.coachingSubscriptionIncidentsPort.paymentCardEventMirrored({
        ...incident,
        outcome: "unknown-customer",
      });

      return { status: "ignored" };
    }

    const previous =
      await this.options.paymentCardsPort.findByPaymentCustomerId(
        paymentCustomerId,
      );
    const saved = await this.options.paymentCardsPort.saveForEvent({
      eventId,
      paymentCustomerId,
      card: PaymentCard.mirror(previous, event),
      previous,
    });

    if (saved === "stale") {
      return "stale";
    }

    this.options.coachingSubscriptionIncidentsPort.paymentCardEventMirrored({
      ...incident,
      outcome: saved,
    });

    return { status: saved };
  }
}
