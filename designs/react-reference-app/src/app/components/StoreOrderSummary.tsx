import { formatStorePrice, type Currency } from '../context/StoreContext';
import { storeOrderTotal, type StoreOrderLine } from '../domain/storeOrder';
import { CONFIRMATION_READINGS_CLASS } from './CheckoutConfirmation';
import { FreeTag } from './FreeTag';
import { Price } from './Price';
import { LABEL_CLASS } from './typography';
import { cn } from './ui/utils';

type StoreOrderSummaryProps = {
  lines: readonly StoreOrderLine[];
  currency: Currency;
  className?: string;
};

export function StoreOrderSummary({ lines, currency, className }: StoreOrderSummaryProps) {
  return (
    <dl className={cn(CONFIRMATION_READINGS_CLASS, className)} data-parity="order-summary">
      {lines.map((line) => (
        <div className="flex items-baseline justify-between gap-4" data-parity="order-line" key={line.productId}>
          <dt className="min-w-0 text-text-primary" data-parity="order-line-title">
            {line.title}
          </dt>
          <dd className="shrink-0">
            {line.amount === null ? (
              <FreeTag data-parity="order-line-free" size="sm" />
            ) : (
              <Price data-parity="order-line-price" size="sm">
                {formatStorePrice(line.amount, currency)}
              </Price>
            )}
          </dd>
        </div>
      ))}
      <div
        className="flex items-baseline justify-between gap-4 border-t border-border-subtle pt-3"
        data-parity="order-total-row"
      >
        <dt className={LABEL_CLASS}>Total</dt>
        <dd className="text-lg font-semibold text-text-primary" data-parity="order-total">
          {formatStorePrice(storeOrderTotal(lines), currency)}
        </dd>
      </div>
    </dl>
  );
}
