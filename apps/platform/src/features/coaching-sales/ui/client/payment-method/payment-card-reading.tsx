import { cn, VALUE_CLASS } from "@eli-coach-platform/ui/lib";
import { CardBrandMark } from "@eli-coach-platform/ui/primitives";

import type { ClientSettings } from "~/features/coaching-sales/contracts/client-subscription";

import {
  cardBrandLabel,
  cardExpiryLine,
  cardNumberSpoken,
  maskedCardNumber,
  NO_PAYMENT_METHOD_LINE,
} from "./payment-method-copy";

export function PaymentCardReading({ card }: { card: ClientSettings["card"] }) {
  if (!card) {
    return <span data-parity="payment-card">{NO_PAYMENT_METHOD_LINE}</span>;
  }

  return (
    <span className="mt-2 flex items-center gap-3" data-parity="payment-card">
      <CardBrandMark brand={card.brand} data-parity="payment-card-mark" />
      <span className="grid min-w-0">
        <span className={cn("flex items-baseline gap-2", VALUE_CLASS)}>
          <span className="font-semibold" data-parity="payment-card-brand">
            {cardBrandLabel(card.brand)}
          </span>{" "}
          <span className="tabular-nums" data-parity="payment-card-number">
            <span aria-hidden="true">{maskedCardNumber(card.lastFour)}</span>
            <span className="sr-only">{cardNumberSpoken(card.lastFour)}</span>
          </span>
        </span>{" "}
        <span className="tabular-nums" data-parity="payment-card-expiry">
          {cardExpiryLine(card)}
        </span>
      </span>
    </span>
  );
}
