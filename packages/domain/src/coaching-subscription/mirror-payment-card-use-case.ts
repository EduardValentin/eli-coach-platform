import type { CoachingSubscriptionIncidents } from "./coaching-subscription-incidents";
import type { CoachingSubscriptions } from "./coaching-subscriptions";
import { PaymentCard } from "./payment-card";
import type { PaymentCardEvent } from "./payment-card-event";
import type { PaymentCards } from "./payment-cards";

type MirrorPaymentCardCommand = {
  eventId: string;
  event: PaymentCardEvent;
};

type MirrorPaymentCardResult = {
  status: "recorded" | "duplicate" | "ignored";
};

type MirrorPaymentCardUseCaseOptions = {
  cards: PaymentCards;
  incidents: CoachingSubscriptionIncidents;
  subscriptions: CoachingSubscriptions;
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
      await this.options.subscriptions.findCurrentByPaymentCustomerId(
        paymentCustomerId,
      );

    if (!subscription) {
      this.options.incidents.paymentCardEventMirrored({
        ...incident,
        outcome: "unknown-customer",
      });

      return { status: "ignored" };
    }

    const previous =
      await this.options.cards.findByPaymentCustomerId(paymentCustomerId);
    const saved = await this.options.cards.saveForEvent({
      eventId,
      paymentCustomerId,
      card: PaymentCard.mirror(previous, event),
      previous,
    });

    if (saved === "stale") {
      return "stale";
    }

    this.options.incidents.paymentCardEventMirrored({
      ...incident,
      outcome: saved,
    });

    return { status: saved };
  }
}
