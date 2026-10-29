import {
  CallAlreadyPaid,
  PurchasedSubscription,
  type CheckoutPurchase,
  type FinishCheckoutPurchaseUseCase,
  type ReadCheckoutPurchaseUseCase,
  type RecordCheckoutPurchaseUseCase,
  type RecordedCheckoutPurchase,
  type RefreshPaymentCardUseCase,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { PaidCheckoutSession } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-event-types.server";
import type { UnitOfWork } from "~/shared/http/unit-of-work";
import { describe, expect, it, vi } from "vitest";

import { CoachingPurchaseCompletionHandler } from "./coaching-purchase-completion-handler.server";

const PAID_AT = new Date("2026-09-27T10:00:00.000Z");

type PurchaseRead = Awaited<ReturnType<ReadCheckoutPurchaseUseCase["execute"]>>;

const notifiedSession: PaidCheckoutSession = {
  id: "cs_test_1",
  customerId: "cus_1",
  subscriptionId: "sub_1",
  paymentIntentId: null,
  amountCents: 44700,
  currency: "eur",
  customerEmail: "ana@example.com",
  paidAt: PAID_AT,
  metadata: { purpose: "coaching-subscription" },
};

const subscription = PurchasedSubscription.fromCompletedCheckout({
  id: "subscription-1",
  completion: {
    checkoutSessionId: "cs_test_1",
    paymentCustomerId: "cus_1",
    paymentSubscriptionId: "sub_1",
    paymentIntentId: null,
    amountCents: 44700,
    currency: "eur",
    customerEmail: "ana@example.com",
    paidAt: PAID_AT,
    assessmentCallId: "call-1",
    bundleId: "3-months",
    tier: "regular",
    startChoice: "waiting",
  },
});

const PURCHASE: CheckoutPurchase = {
  eventId: "evt_1",
  receivedAt: PAID_AT,
  client: {
    assessmentCallId: "call-1",
    firstName: "Ana",
    lastName: "Popescu",
    email: "ana@example.com",
    dateOfBirth: "1994-03-14",
    gender: "female",
    primaryGoal: "build_strength",
    country: "RO",
    phone: null,
    bookingTimeZone: "Europe/Bucharest",
  },
  subscription,
  paymentCustomerId: "cus_1",
};

const FOUND: PurchaseRead = { status: "found", purchase: PURCHASE };

const RECORDED: RecordedCheckoutPurchase = {
  status: "recorded",
  clientId: "client-1",
  subscription,
  paymentCustomerId: "cus_1",
};

const DUPLICATE: RecordedCheckoutPurchase = {
  ...RECORDED,
  status: "duplicate",
};

describe("CoachingPurchaseCompletionHandler", () => {
  it("serves the coaching subscription purpose", () => {
    // arrange
    const { handler } = createHandler();

    // act
    const purpose = handler.purpose;

    // assert
    expect(purpose).toBe("coaching-subscription");
  });

  it.each<[RecordedCheckoutPurchase, string]>([
    [RECORDED, "recorded"],
    [DUPLICATE, "duplicate"],
  ])(
    "reads the notified session for the event, records the purchase it drafts and answers %o as %s",
    async (recorded, expected) => {
      // arrange
      const { handler, readCheckout, recordCheckout } = createHandler({
        recorded,
      });

      // act
      const outcome = await handler.handle("evt_1", notifiedSession);

      // assert
      expect(outcome).toBe(expected);
      expect(readCheckout).toHaveBeenCalledWith({
        eventId: "evt_1",
        checkoutSessionId: "cs_test_1",
      });
      expect(recordCheckout).toHaveBeenCalledWith(PURCHASE);
    },
  );

  it.each<PurchaseRead>([
    { status: "call_not_found" },
    { status: "unreadable_checkout" },
  ])(
    "answers %o as ignored and records, finishes and mirrors nothing",
    async (read) => {
      // arrange
      const { handler, recordCheckout, finishCheckout, refreshCard } =
        createHandler({ read });

      // act
      const outcome = await handler.handle("evt_1", notifiedSession);

      // assert
      expect(outcome).toBe("ignored");
      expect(recordCheckout).not.toHaveBeenCalled();
      expect(finishCheckout).not.toHaveBeenCalled();
      expect(refreshCard).not.toHaveBeenCalled();
    },
  );

  it("answers an already paid call as ignored and finishes nothing", async () => {
    // arrange
    const { handler, recordCheckout, finishCheckout, refreshCard } =
      createHandler();
    recordCheckout.mockRejectedValue(new CallAlreadyPaid());

    // act
    const outcome = await handler.handle("evt_1", notifiedSession);

    // assert
    expect(outcome).toBe("ignored");
    expect(finishCheckout).not.toHaveBeenCalled();
    expect(refreshCard).not.toHaveBeenCalled();
  });

  it.each<RecordedCheckoutPurchase>([RECORDED, DUPLICATE])(
    "finishes the purchase and mirrors the card on file of her payment customer once the purchase answers %o",
    async (recorded) => {
      // arrange
      const { handler, finishCheckout, refreshCard } = createHandler({
        recorded,
      });

      // act
      await handler.handle("evt_1", notifiedSession);

      // assert
      expect(finishCheckout).toHaveBeenCalledWith(recorded);
      expect(refreshCard).toHaveBeenCalledWith({ paymentCustomerId: "cus_1" });
    },
  );

  it("reads the checkout before the unit of work, records the purchase inside it and finishes it and mirrors the card after that unit commits", async () => {
    // arrange
    const {
      handler,
      readCheckout,
      recordCheckout,
      finishCheckout,
      refreshCard,
      ranInside,
    } = createHandler();

    // act
    await handler.handle("evt_1", notifiedSession);

    // assert
    expect(ranInside.get(readCheckout)).toBe(false);
    expect(ranInside.get(recordCheckout)).toBe(true);
    expect(ranInside.get(finishCheckout)).toBe(false);
    expect(ranInside.get(refreshCard)).toBe(false);
  });

  it("fails the delivery when the purchase's unit of work fails, so the provider redelivers", async () => {
    // arrange
    const failure = new Error("connection reset");
    const { handler, finishCheckout } = createHandler({
      unitOfWork: async () => {
        throw failure;
      },
    });

    // act
    const handling = handler.handle("evt_1", notifiedSession);

    // assert
    await expect(handling).rejects.toBe(failure);
    expect(finishCheckout).not.toHaveBeenCalled();
  });

  it("fails the delivery when the card on file cannot be mirrored, so the provider redelivers", async () => {
    // arrange
    const failure = new Error("provider down");
    const { handler, refreshCard } = createHandler();
    refreshCard.mockRejectedValue(failure);

    // act
    const handling = handler.handle("evt_1", notifiedSession);

    // assert
    await expect(handling).rejects.toBe(failure);
  });
});

function createHandler(
  answers: {
    read?: PurchaseRead;
    recorded?: RecordedCheckoutPurchase;
    unitOfWork?: UnitOfWork;
  } = {},
) {
  const recorded = answers.recorded ?? RECORDED;
  let insideUnitOfWork = false;
  const ranInside = new Map<unknown, boolean>();
  const observed = <Result>(step: ReturnType<typeof vi.fn>, result: Result) =>
    step.mockImplementation(async () => {
      ranInside.set(step, insideUnitOfWork);

      return result;
    });
  const readCheckout = vi.fn();
  const recordCheckout = vi.fn();
  const finishCheckout = vi.fn();
  const refreshCard = vi.fn();
  observed(readCheckout, answers.read ?? FOUND);
  observed(recordCheckout, recorded);
  observed(finishCheckout, {
    status: recorded.status,
    paymentCustomerId: "cus_1",
  });
  observed(refreshCard, undefined);
  const unitOfWork: UnitOfWork =
    answers.unitOfWork ??
    (async (work) => {
      insideUnitOfWork = true;

      try {
        return await work();
      } finally {
        insideUnitOfWork = false;
      }
    });

  const handler = new CoachingPurchaseCompletionHandler({
    finishCheckoutPurchase: {
      execute: finishCheckout,
    } as unknown as FinishCheckoutPurchaseUseCase,
    readCheckoutPurchase: {
      execute: readCheckout,
    } as unknown as ReadCheckoutPurchaseUseCase,
    recordCheckoutPurchase: {
      execute: recordCheckout,
    } as unknown as RecordCheckoutPurchaseUseCase,
    refreshPaymentCard: {
      execute: refreshCard,
    } as unknown as RefreshPaymentCardUseCase,
    unitOfWork,
  });

  return {
    handler,
    readCheckout,
    recordCheckout,
    finishCheckout,
    refreshCard,
    ranInside,
  };
}
