import type { ComponentPropsWithoutRef } from 'react';
import type { CardBrand } from '../domain/coachingSubscription';
import { cn } from './ui/utils';

const VISA_BLUE = '#1A1F71';
const MASTERCARD_RED = '#EB001B';
const MASTERCARD_ORANGE = '#F79E1B';
const MASTERCARD_OVERLAP = '#FF5F00';

const MARK_BOX = '0 0 46 30';

function VisaMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-full"
      data-mark="visa"
      viewBox={MARK_BOX}
    >
      <g fill={VISA_BLUE} transform="translate(1.6 0) skewX(-10)">
        <path d="M9 10h2.8l1.7 7 1.7-7H18l-3.1 10h-2.8z" />
        <path d="M18.8 10h2.6v10h-2.6z" />
        <path
          d="M28.5 11.6c-.7-.9-1.9-1.4-3.1-1.4-1.6 0-2.6.9-2.6 2.4 0 3 5.8 2 5.8 4.9 0 1.5-1.2 2.4-3 2.4-1.3 0-2.5-.6-3.2-1.6"
          fill="none"
          stroke={VISA_BLUE}
          strokeWidth={2.2}
        />
        <path
          d="M29.6 20 33 10h2.8l3.4 10h-2.7l-.6-2h-3l-.6 2zm3.9-4.2h1.8l-.9-3z"
          fillRule="evenodd"
        />
      </g>
    </svg>
  );
}

function MastercardMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-full"
      data-mark="mastercard"
      viewBox={MARK_BOX}
    >
      <circle cx={18.5} cy={15} fill={MASTERCARD_RED} r={8.5} />
      <circle cx={27.5} cy={15} fill={MASTERCARD_ORANGE} r={8.5} />
      <path
        d="M23 7.79a8.5 8.5 0 0 1 0 14.42 8.5 8.5 0 0 1 0-14.42z"
        fill={MASTERCARD_OVERLAP}
      />
    </svg>
  );
}

function NeutralCardMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-full"
      data-mark="card"
      viewBox={MARK_BOX}
    >
      <rect
        fill="none"
        height={15}
        rx={2.5}
        stroke="currentColor"
        strokeWidth={1.5}
        width={23}
        x={11.5}
        y={7.5}
      />
      <path d="M11.5 11h23v3h-23z" fill="currentColor" />
      <path d="M14.5 18.25h6" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

function markFor(brand: CardBrand) {
  if (brand === 'visa') return <VisaMark />;
  if (brand === 'mastercard') return <MastercardMark />;
  return <NeutralCardMark />;
}

type CardBrandMarkProps = { brand: CardBrand } & Omit<
  ComponentPropsWithoutRef<'span'>,
  'children'
>;

export function CardBrandMark({
  brand,
  className,
  ...rest
}: CardBrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-8 w-12 shrink-0 overflow-hidden rounded-tile border border-border-subtle bg-surface-base text-text-secondary',
        className,
      )}
      {...rest}
    >
      {markFor(brand)}
    </span>
  );
}
