import { ConfirmationReadings } from "~/shared/design-system/layout";
import { LABEL_CLASS } from "~/shared/design-system/lib";
import {
  formatStoreAmount,
  type StoreCurrency,
} from "~/bounded-contexts/sales/store/public/store-currency";

import { FreeTag } from "./free-tag";
import { Price } from "./price";

export type StoreOrderLine = {
  amountMinorUnits: number | null;
  title: string;
};

export function StoreOrderSummary(props: {
  className?: string;
  currency: StoreCurrency;
  lines: readonly StoreOrderLine[];
}) {
  const totalMinorUnits = props.lines.reduce(
    (total, line) => total + (line.amountMinorUnits ?? 0),
    0,
  );

  return (
    <ConfirmationReadings
      className={props.className}
      data-parity="order-summary"
    >
      {props.lines.map((line, index) => (
        <div
          className="flex items-baseline justify-between gap-4"
          data-parity="order-line"
          key={`${index}-${line.title}`}
        >
          <dt
            className="min-w-0 text-text-primary"
            data-parity="order-line-title"
          >
            {line.title}
          </dt>
          <dd className="shrink-0">
            {line.amountMinorUnits === null ? (
              <FreeTag data-parity="order-line-free" size="sm" />
            ) : (
              <Price data-parity="order-line-price" size="sm">
                {formatStoreAmount(line.amountMinorUnits, props.currency)}
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
        <dd
          className="text-lg font-semibold text-text-primary"
          data-parity="order-total"
        >
          {formatStoreAmount(totalMinorUnits, props.currency)}
        </dd>
      </div>
    </ConfirmationReadings>
  );
}
