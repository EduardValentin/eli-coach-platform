import { Check, ShoppingBag } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../lib/cn";
import type { DataAttributes } from "../lib/data-attributes";
import { cardVariants } from "../primitives";

type ConfirmationOutcome = "confirmed" | "not-completed";

const OUTCOME_BADGES: Record<
  ConfirmationOutcome,
  { className: string; icon: ReactNode }
> = {
  confirmed: {
    className: "bg-success-surface text-feedback-success",
    icon: <Check aria-hidden="true" size={28} />,
  },
  "not-completed": {
    className: "bg-brand-secondary-soft text-brand-secondary",
    icon: <ShoppingBag aria-hidden="true" size={26} />,
  },
};

type ConfirmationPageProps = DataAttributes & { children: ReactNode };

export function ConfirmationPage({
  children,
  ...dataAttributes
}: ConfirmationPageProps) {
  return (
    <div
      {...dataAttributes}
      className="min-h-screen bg-surface-page px-4 pt-32 pb-16 sm:px-6"
    >
      <div
        className={cn(
          cardVariants({ variant: "panel" }),
          "mx-auto w-full max-w-xl px-6 py-10 sm:px-10",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function ConfirmationHeading(props: {
  children: ReactNode;
  outcome: ConfirmationOutcome;
}) {
  const badge = OUTCOME_BADGES[props.outcome];

  return (
    <>
      <span
        className={cn(
          "mx-auto flex size-14 items-center justify-center rounded-full",
          badge.className,
        )}
        data-parity="confirmation-badge"
      >
        {badge.icon}
      </span>

      <h1 className="mt-6 text-center font-heading text-display-sm text-text-primary">
        {props.children}
      </h1>
    </>
  );
}

export function ConfirmationLead({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cn(
        "mt-4 text-center text-base leading-relaxed text-text-secondary",
        className,
      )}
      {...props}
    />
  );
}

export function ConfirmationActions({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("mt-8 flex justify-center", className)} {...props} />
  );
}

export function ConfirmationReadings({
  className,
  ...props
}: ComponentPropsWithoutRef<"dl">) {
  return (
    <dl
      className={cn(
        "grid gap-3 rounded-card border border-border-subtle bg-surface-quiet px-5 py-4 text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function ConfirmationReading(props: { term: string; value: string }) {
  return (
    <div
      className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
      data-parity={`reading-${props.term.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <dt className="text-text-secondary">{props.term}</dt>
      <dd className="font-medium text-text-primary sm:text-right">
        {props.value}
      </dd>
    </div>
  );
}
