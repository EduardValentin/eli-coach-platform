import { CreditCard } from 'lucide-react';
import type { CardOnFile } from '../../domain/coachingSubscription';
import { maskedCardNumber } from '../../utils/cardOnFile';
import {
  CARD_BRAND_LABELS,
  cardExpiryLine,
  cardNumberSpoken,
  NO_CARD_ON_FILE_LINE,
} from '../../utils/subscriptionCopy';
import { VALUE_CLASS } from '../typography';
import { cn } from '../ui/utils';

export function CardOnFileReading({ card }: { card: CardOnFile | undefined }) {
  if (!card) {
    return <span data-parity="payment-card">{NO_CARD_ON_FILE_LINE}</span>;
  }

  return (
    <span className="mt-2 flex items-center gap-3" data-parity="payment-card">
      <span
        aria-hidden="true"
        className="flex h-8 w-12 shrink-0 items-center justify-center rounded-tile border border-border-subtle bg-surface-quiet text-text-secondary"
      >
        <CreditCard size={16} />
      </span>
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
