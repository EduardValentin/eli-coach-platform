import {
  PaymentCard,
  type MirrorPaymentCardUseCase,
} from "@eli-coach-platform/domain/coaching-subscription";
import type { PaymentCardChange } from "@eli-coach-platform/infrastructure/payments/server";
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
  const handler = new CoachingPaymentCardHandler({
    mirrorPaymentCard: {
      execute: mirror,
    } as unknown as MirrorPaymentCardUseCase,
  });

  return { handler, mirror };
}

describe("CoachingPaymentCardHandler", () => {
  it.each([
    ["attached", "card-attached"],
    ["updated", "card-updated"],
  ] as const)(
    "mirrors a card %s to her customer as the card on file",
    async (kind, eventKind) => {
      // arrange
      const { handler, mirror } = createHandler();
      const change: PaymentCardChange = { kind, ...VISA_CHANGE };

      // act
      await handler.handle("evt_1", change);

      // assert
      expect(mirror).toHaveBeenCalledWith({
        eventId: "evt_1",
        event: { kind: eventKind, paymentCustomerId: "cus_1", card: VISA },
      });
    },
  );

  it("mirrors a detached card by its payment method", async () => {
    // arrange
    const { handler, mirror } = createHandler();

    // act
    await handler.handle("evt_2", { kind: "detached", ...VISA_CHANGE });

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
      const { handler } = createHandler(status);

      // act
      const outcome = await handler.handle("evt_1", {
        kind: "attached",
        ...VISA_CHANGE,
      });

      // assert
      expect(outcome).toBe(status);
    },
  );
});
