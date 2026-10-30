import {
  PaymentCard,
  type MirrorPaymentCardUseCase,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { PaymentCardChange } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-event-types.server";
import { describe, expect, it, vi } from "vitest";

import { CoachingPaymentCardHandler } from "./coaching-payment-card-handler.server";

type MirrorStatus = Awaited<
  ReturnType<MirrorPaymentCardUseCase["execute"]>
>["status"];

const VISA_CHANGE = {
  customerId: "cus_1",
  paymentMethodId: "pm_visa",
  brand: "visa",
  lastFour: "4242",
  expiryMonth: 12,
  expiryYear: 2034,
};

const VISA = PaymentCard.of({
  brand: "visa",
  lastFour: "4242",
  expiryMonth: 12,
  expiryYear: 2034,
  paymentMethodId: "pm_visa",
});

function createHandler(status: MirrorStatus = "recorded") {
  const mirror = vi.fn().mockResolvedValue({ status });
  const coachingPaymentCardHandler = new CoachingPaymentCardHandler({
    mirrorPaymentCardUseCase: {
      execute: mirror,
    } as unknown as MirrorPaymentCardUseCase,
  });

  return { coachingPaymentCardHandler, mirror };
}

describe("CoachingPaymentCardHandler", () => {
  it.each([
    ["attached", "card-attached"],
    ["updated", "card-updated"],
  ] as const)(
    "mirrors a card %s to her customer as the card on file",
    async (kind, eventKind) => {
      // arrange
      const { coachingPaymentCardHandler, mirror } = createHandler();
      const change: PaymentCardChange = { kind, ...VISA_CHANGE };

      // act
      await coachingPaymentCardHandler.handle("evt_1", change);

      // assert
      expect(mirror).toHaveBeenCalledWith({
        eventId: "evt_1",
        event: { kind: eventKind, paymentCustomerId: "cus_1", card: VISA },
      });
    },
  );

  it("mirrors a detached card by its payment method", async () => {
    // arrange
    const { coachingPaymentCardHandler, mirror } = createHandler();

    // act
    await coachingPaymentCardHandler.handle("evt_2", {
      kind: "detached",
      ...VISA_CHANGE,
    });

    // assert
    expect(mirror).toHaveBeenCalledWith({
      eventId: "evt_2",
      event: {
        kind: "card-detached",
        paymentCustomerId: "cus_1",
        paymentMethodId: "pm_visa",
      },
    });
  });

  it.each<MirrorStatus>(["recorded", "duplicate", "ignored"])(
    "answers what the mirror answered: %s",
    async (status) => {
      // arrange
      const { coachingPaymentCardHandler } = createHandler(status);

      // act
      const outcome = await coachingPaymentCardHandler.handle("evt_1", {
        kind: "attached",
        ...VISA_CHANGE,
      });

      // assert
      expect(outcome).toBe(status);
    },
  );
});
