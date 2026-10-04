import { describe, expect, it, vi } from "vitest";

import { CoachingSubscription } from "./coaching-subscription";
import type { CoachingSubscriptionIncidents } from "./coaching-subscription-incidents";
import type { CoachingSubscriptions } from "./coaching-subscriptions";
import { MirrorPaymentCardUseCase } from "./mirror-payment-card-use-case";
import { PaymentCard } from "./payment-card";
import type { PaymentCards } from "./payment-cards";
import type { PaymentCustomerCards } from "./payment-customer-cards";
import { RefreshPaymentCardUseCase } from "./refresh-payment-card-use-case";

const CUSTOMER_ID = "cus_1";

const VISA = PaymentCard.of({
  brand: "visa",
  lastFour: "4242",
  expiryMonth: 12,
  expiryYear: 2034,
  paymentMethodId: "pm_visa",
});

const MASTERCARD = PaymentCard.of({
  brand: "mastercard",
  lastFour: "4444",
  expiryMonth: 3,
  expiryYear: 2031,
  paymentMethodId: "pm_mastercard",
});

const SUBSCRIPTION = CoachingSubscription.reconstitute({
  id: "subscription-1",
  clientId: "client-1",
  bundleId: "3-months",
  months: 3,
  tier: "regular",
  amountCents: 44700,
  currency: "eur",
  paymentCustomerId: CUSTOMER_ID,
  paymentSubscriptionId: "sub_1",
  checkoutSessionId: "cs_1",
  paidAt: new Date("2026-10-02T10:00:00.000Z"),
  startChoice: "waiting",
  status: "not-started",
  cancelledAt: null,
  accessEndsAt: null,
  paymentProblemSince: null,
  refund: null,
});

function createCards(stored: PaymentCard | null) {
  return {
    findByPaymentCustomerId: vi.fn().mockResolvedValue(stored),
    save: vi.fn().mockResolvedValue("saved"),
    saveForEvent: vi.fn().mockResolvedValue("recorded"),
  } satisfies PaymentCards;
}

function createCustomerCards(card: PaymentCard | null) {
  return {
    readDefaultCard: vi.fn().mockResolvedValue(card),
  } satisfies PaymentCustomerCards;
}

function createSubscriptions(found: CoachingSubscription | null) {
  return {
    findCurrentForClient: vi.fn().mockResolvedValue(found),
    findCurrentForAuthSubject: vi.fn().mockResolvedValue(found),
    findByPaymentSubscriptionId: vi.fn().mockResolvedValue(found),
    findCurrentByPaymentCustomerId: vi.fn().mockResolvedValue(found),
    save: vi.fn().mockResolvedValue("saved"),
    saveForEvent: vi.fn().mockResolvedValue("recorded"),
  } satisfies CoachingSubscriptions;
}

function createIncidents() {
  return {
    subscriptionCancelled: vi.fn(),
    subscriptionCancellationFailed: vi.fn(),
    programStartedNow: vi.fn(),
    subscriptionEventReconciled: vi.fn(),
    refundSettled: vi.fn(),
    paymentMethodSessionOpened: vi.fn(),
    renewalHoldApplied: vi.fn(),
    renewalHoldFailed: vi.fn(),
    refundNotificationFailed: vi.fn(),
    paymentEventRejected: vi.fn(),
    paymentCardEventMirrored: vi.fn(),
    paymentCardRefreshFailed: vi.fn(),
  } satisfies CoachingSubscriptionIncidents;
}

function mirrorUseCase(options: {
  cards: ReturnType<typeof createCards>;
  subscriptions?: ReturnType<typeof createSubscriptions>;
  incidents?: ReturnType<typeof createIncidents>;
}) {
  return new MirrorPaymentCardUseCase({
    cards: options.cards,
    incidents: options.incidents ?? createIncidents(),
    subscriptions: options.subscriptions ?? createSubscriptions(SUBSCRIPTION),
  });
}

describe("MirrorPaymentCardUseCase", () => {
  it("records an attached card as the card on file together with the event", async () => {
    // arrange
    const cards = createCards(VISA);
    const incidents = createIncidents();
    const useCase = mirrorUseCase({ cards, incidents });

    // act
    const result = await useCase.execute({
      eventId: "evt_1",
      event: {
        kind: "card-attached",
        paymentCustomerId: CUSTOMER_ID,
        card: MASTERCARD,
      },
    });

    // assert
    expect(result).toEqual({ status: "recorded" });
    expect(cards.findByPaymentCustomerId).toHaveBeenCalledWith(CUSTOMER_ID);
    expect(cards.saveForEvent).toHaveBeenCalledWith({
      eventId: "evt_1",
      paymentCustomerId: CUSTOMER_ID,
      card: MASTERCARD,
      previous: VISA,
    });
    expect(incidents.paymentCardEventMirrored).toHaveBeenCalledWith({
      eventId: "evt_1",
      eventKind: "card-attached",
      paymentCustomerId: CUSTOMER_ID,
      outcome: "recorded",
    });
  });

  it("clears the card on file when the mirrored card is detached", async () => {
    // arrange
    const cards = createCards(VISA);
    const useCase = mirrorUseCase({ cards });

    // act
    await useCase.execute({
      eventId: "evt_2",
      event: {
        kind: "card-detached",
        paymentCustomerId: CUSTOMER_ID,
        paymentMethodId: "pm_visa",
      },
    });

    // assert
    expect(cards.saveForEvent).toHaveBeenCalledWith({
      eventId: "evt_2",
      paymentCustomerId: CUSTOMER_ID,
      card: null,
      previous: VISA,
    });
  });

  it("keeps the newer card when the detach of an earlier card arrives after it", async () => {
    // arrange
    const cards = createCards(MASTERCARD);
    const useCase = mirrorUseCase({ cards });

    // act
    await useCase.execute({
      eventId: "evt_3",
      event: {
        kind: "card-detached",
        paymentCustomerId: CUSTOMER_ID,
        paymentMethodId: "pm_visa",
      },
    });

    // assert
    expect(cards.saveForEvent).toHaveBeenCalledWith({
      eventId: "evt_3",
      paymentCustomerId: CUSTOMER_ID,
      card: MASTERCARD,
      previous: MASTERCARD,
    });
  });

  it("answers duplicate for a redelivered event", async () => {
    // arrange
    const cards = createCards(VISA);
    cards.saveForEvent.mockResolvedValue("duplicate");
    const incidents = createIncidents();
    const useCase = mirrorUseCase({ cards, incidents });

    // act
    const result = await useCase.execute({
      eventId: "evt_1",
      event: {
        kind: "card-updated",
        paymentCustomerId: CUSTOMER_ID,
        card: VISA,
      },
    });

    // assert
    expect(result).toEqual({ status: "duplicate" });
    expect(incidents.paymentCardEventMirrored).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "duplicate" }),
    );
  });

  it("acknowledges a card of a customer it does not know without saving and reports it", async () => {
    // arrange
    const cards = createCards(null);
    const incidents = createIncidents();
    const useCase = mirrorUseCase({
      cards,
      incidents,
      subscriptions: createSubscriptions(null),
    });

    // act
    const result = await useCase.execute({
      eventId: "evt_4",
      event: {
        kind: "card-attached",
        paymentCustomerId: "cus_unknown",
        card: VISA,
      },
    });

    // assert
    expect(result).toEqual({ status: "ignored" });
    expect(cards.saveForEvent).not.toHaveBeenCalled();
    expect(incidents.paymentCardEventMirrored).toHaveBeenCalledWith({
      eventId: "evt_4",
      eventKind: "card-attached",
      paymentCustomerId: "cus_unknown",
      outcome: "unknown-customer",
    });
  });

  it("re-reads and re-decides once when the card on file changed meanwhile", async () => {
    // arrange
    const cards = createCards(VISA);
    cards.findByPaymentCustomerId
      .mockResolvedValueOnce(VISA)
      .mockResolvedValueOnce(MASTERCARD);
    cards.saveForEvent
      .mockResolvedValueOnce("stale")
      .mockResolvedValueOnce("recorded");
    const useCase = mirrorUseCase({ cards });

    // act
    const result = await useCase.execute({
      eventId: "evt_5",
      event: {
        kind: "card-detached",
        paymentCustomerId: CUSTOMER_ID,
        paymentMethodId: "pm_visa",
      },
    });

    // assert
    expect(result).toEqual({ status: "recorded" });
    expect(cards.saveForEvent).toHaveBeenLastCalledWith({
      eventId: "evt_5",
      paymentCustomerId: CUSTOMER_ID,
      card: MASTERCARD,
      previous: MASTERCARD,
    });
  });

  it("fails the delivery so the provider redelivers when the card on file keeps changing", async () => {
    // arrange
    const cards = createCards(VISA);
    cards.saveForEvent.mockResolvedValue("stale");
    const useCase = mirrorUseCase({ cards });

    // act
    const mirroring = useCase.execute({
      eventId: "evt_6",
      event: {
        kind: "card-attached",
        paymentCustomerId: CUSTOMER_ID,
        card: MASTERCARD,
      },
    });

    // assert
    await expect(mirroring).rejects.toThrow();
    expect(cards.saveForEvent).toHaveBeenCalledTimes(2);
  });
});

describe("RefreshPaymentCardUseCase", () => {
  it("saves the provider's default card over the card it read first", async () => {
    // arrange
    const cards = createCards(VISA);
    const customerCards = createCustomerCards(MASTERCARD);
    const useCase = new RefreshPaymentCardUseCase({
      cards,
      customerCards,
      incidents: createIncidents(),
    });

    // act
    await useCase.execute({ paymentCustomerId: CUSTOMER_ID });

    // assert
    expect(customerCards.readDefaultCard).toHaveBeenCalledWith(CUSTOMER_ID);
    expect(cards.save).toHaveBeenCalledWith({
      paymentCustomerId: CUSTOMER_ID,
      card: MASTERCARD,
      previous: VISA,
    });
  });

  it("clears the card on file when the provider holds no default card", async () => {
    // arrange
    const cards = createCards(VISA);
    const useCase = new RefreshPaymentCardUseCase({
      cards,
      customerCards: createCustomerCards(null),
      incidents: createIncidents(),
    });

    // act
    await useCase.execute({ paymentCustomerId: CUSTOMER_ID });

    // assert
    expect(cards.save).toHaveBeenCalledWith({
      paymentCustomerId: CUSTOMER_ID,
      card: null,
      previous: VISA,
    });
  });

  it("leaves a card an event saved meanwhile in place", async () => {
    // arrange
    const cards = createCards(null);
    cards.save.mockResolvedValue("stale");
    const useCase = new RefreshPaymentCardUseCase({
      cards,
      customerCards: createCustomerCards(VISA),
      incidents: createIncidents(),
    });

    // act
    const refreshing = useCase.execute({ paymentCustomerId: CUSTOMER_ID });

    // assert
    await expect(refreshing).resolves.toBeUndefined();
    expect(cards.save).toHaveBeenCalledTimes(1);
  });

  it("reports the failed read and fails so the delivery is retried", async () => {
    // arrange
    const failure = new Error("provider down");
    const cards = createCards(null);
    const incidents = createIncidents();
    const customerCards = createCustomerCards(null);
    customerCards.readDefaultCard.mockRejectedValue(failure);
    const useCase = new RefreshPaymentCardUseCase({
      cards,
      customerCards,
      incidents,
    });

    // act
    const refreshing = useCase.execute({ paymentCustomerId: CUSTOMER_ID });

    // assert
    await expect(refreshing).rejects.toBe(failure);
    expect(cards.save).not.toHaveBeenCalled();
    expect(incidents.paymentCardRefreshFailed).toHaveBeenCalledWith({
      paymentCustomerId: CUSTOMER_ID,
      error: failure,
    });
  });
});
