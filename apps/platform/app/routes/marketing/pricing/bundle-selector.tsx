import {
  coachingBundleBenefits,
  coachingBundles,
  resolveCoachingBundleDisplay,
  type CoachingBundle,
  type ResolvedCoachingBundleDisplay,
} from "@eli-coach-platform/domain";
import { cn } from "@eli-coach-platform/ui";
import { CheckCircle2, Star } from "lucide-react";

type BundleSelectorProps = {
  waitlistMode: boolean;
};

export function BundleSelector(props: BundleSelectorProps) {
  return (
    <section
      aria-labelledby="bundle-selector-heading"
      className="mx-auto w-full max-w-4xl"
    >
      <h2 className="ui-sr-only" id="bundle-selector-heading">
        Coaching bundle options
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {coachingBundles.map((bundle) => (
          <BundleCard
            bundle={bundle}
            display={resolveCoachingBundleDisplay({
              bundle,
              waitlistMode: props.waitlistMode,
            })}
            key={bundle.id}
          />
        ))}
      </div>
      <BundleBenefits />
    </section>
  );
}

function BundleCard(props: {
  bundle: CoachingBundle;
  display: ResolvedCoachingBundleDisplay;
}) {
  const { bundle, display } = props;

  return (
    <article
      aria-labelledby={`bundle-${bundle.id}-title`}
      className={cn(
        "relative flex min-h-52 flex-col items-center justify-center rounded-panel border-2 bg-surface-base px-6 py-8 text-center shadow-soft transition-[border-color,box-shadow,transform] duration-150 ease-out",
        {
          "border-brand-primary/30 shadow-raised": display.isWaitlistPrice,
          "border-border-subtle hover:border-border-strong": !display.isWaitlistPrice,
        },
      )}
    >
      <BundleCardBadges display={display} />
      <h3
        className="mb-1 font-heading text-body-lg font-medium text-text-primary"
        id={`bundle-${bundle.id}-title`}
      >
        {bundle.title}
      </h3>
      <p className="mb-4 text-body-sm text-text-muted">{bundle.months} months</p>
      <BundlePrice bundle={bundle} display={display} />
    </article>
  );
}

function BundleCardBadges(props: { display: ResolvedCoachingBundleDisplay }) {
  const { display } = props;

  return (
    <>
      {display.isPopular ? (
        <div className="absolute -top-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-pill bg-text-primary px-3 py-1 text-label font-semibold uppercase tracking-label text-text-inverted shadow-raised">
          <Star aria-hidden="true" className="fill-current" size={12} />
          Most Popular
        </div>
      ) : null}
      {display.badgeLabel ? (
        <div
          className={cn(
            "absolute right-4 top-4 rounded-xs px-2 py-1 text-label font-semibold uppercase tracking-label",
            {
              "bg-brand-primary text-text-inverted": display.isWaitlistPrice,
              "bg-feedback-success-soft text-feedback-success": !display.isWaitlistPrice,
            },
          )}
        >
          {display.badgeLabel}
        </div>
      ) : null}
    </>
  );
}

function BundlePrice(props: {
  bundle: CoachingBundle;
  display: ResolvedCoachingBundleDisplay;
}) {
  const { bundle, display } = props;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-center gap-1">
        {display.originalPricePerMonth ? (
          <span
            aria-label={`Original ${bundle.title.toLowerCase()} monthly price ${formatCurrency(display.originalPricePerMonth)}`}
            className="mb-1 text-body-lg font-semibold text-text-muted line-through"
          >
            {formatCurrency(display.originalPricePerMonth)}
          </span>
        ) : null}
        <span
          aria-label={`${bundle.title} monthly price ${formatCurrency(display.pricePerMonth)}`}
          className={cn("font-body text-display-md font-semibold", {
            "text-brand-primary": display.isWaitlistPrice,
            "text-text-primary": !display.isWaitlistPrice,
          })}
        >
          {formatCurrency(display.pricePerMonth)}
        </span>
        <span className="mb-1 text-body-sm font-medium text-text-secondary">/mo</span>
      </div>
      <p className="mt-2 text-body-sm font-medium text-text-muted">
        {display.originalTotalPrice ? (
          <span
            aria-label={`Original ${bundle.title.toLowerCase()} billing total ${formatCurrency(display.originalTotalPrice)}`}
            className="mr-1 line-through"
          >
            {formatCurrency(display.originalTotalPrice)}
          </span>
        ) : null}
        Billed as {formatCurrency(display.totalPrice)}
      </p>
    </div>
  );
}

function BundleBenefits() {
  return (
    <section
      aria-labelledby="bundle-benefits-heading"
      className="mt-10 rounded-panel border border-border-subtle bg-surface-base p-8 shadow-soft md:p-10"
    >
      <h3
        className="mb-6 text-center text-label font-semibold uppercase tracking-label text-text-muted"
        id="bundle-benefits-heading"
      >
        What's included in every plan
      </h3>
      <ul className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        {coachingBundleBenefits.map((benefit) => (
          <li className="flex items-start gap-3" key={benefit}>
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-brand-primary"
              size={18}
            />
            <span className="text-body-sm text-text-secondary">{benefit}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}
