import type { CardOnFile } from '../../domain/coachingSubscription';
import {
  CARD_BRAND_LABELS,
  cardExpiryLine,
  cardNumberSpoken,
  maskedCardNumber,
  NO_PAYMENT_METHOD_LINE,
} from '../../utils/cardOnFile';
import { CardBrandMark } from '../CardBrandMark';
import { VALUE_CLASS } from '../typography';
import { cn } from '../ui/utils';

export function CardOnFileReading({ card }: { card: CardOnFile | undefined }) {
  if (!card) {
    return <span data-parity="payment-card">{NO_PAYMENT_METHOD_LINE}</span>;
  }

  return (
    <span className="mt-2 flex items-center gap-3" data-parity="payment-card">
      <CardBrandMark brand={card.brand} data-parity="payment-card-mark" />
      <span className="grid min-w-0">
        <span className={cn('flex items-baseline gap-2', VALUE_CLASS)}>
          <span className="font-semibold" data-parity="payment-card-brand">
            {CARD_BRAND_LABELS[card.brand]}
          </span>{' '}
          <span className="tabular-nums" data-parity="payment-card-number">
            <span aria-hidden="true">{maskedCardNumber(card.lastFour)}</span>
            <span className="sr-only">{cardNumberSpoken(card.lastFour)}</span>
          </span>
        </span>{' '}
        <span className="tabular-nums" data-parity="payment-card-expiry">
          {cardExpiryLine(card)}
        </span>
      </span>
    </span>
  );
}
