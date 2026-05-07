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
      <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3">
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
        "relative rounded-md border-2 bg-surface-base px-6 py-7 text-center shadow-sm transition-[border-color,box-shadow,transform] duration-150 ease-out",
        {
          "border-brand-primary/30 shadow-md": display.isWaitlistPrice,
          "border-neutral-100 hover:border-neutral-300": !display.isWaitlistPrice,
        },
      )}
    >
      <BundleCardBadges display={display} />
      <h3
        className="mb-1 font-heading text-lg font-medium leading-7 text-text-primary"
        id={`bundle-${bundle.id}-title`}
      >
        {bundle.title}
      </h3>
      <BundlePrice bundle={bundle} display={display} />
    </article>
  );
}

function BundleCardBadges(props: { display: ResolvedCoachingBundleDisplay }) {
  const { display } = props;

  return (
    <>
      {display.isPopular ? (
        <div className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-text-primary px-3 py-0.5 text-[11px] font-bold uppercase leading-[1.5] tracking-wider text-text-inverted shadow-md">
          <Star aria-hidden="true" className="fill-current" size={10} />
          Most Popular
        </div>
      ) : null}
      {display.badgeLabel ? (
        <div
          className={`absolute whitespace-nowrap font-bold uppercase ${
            display.isWaitlistPrice
              ? "-top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-primary px-3 py-0.5 text-[11px] leading-[1.5] tracking-wider text-text-inverted shadow-md"
              : "right-3 top-3 rounded-[6px] bg-green-100 px-1.5 py-0.5 text-[10px] leading-[1.5] [letter-spacing:0.025em] text-green-700"
          }`}
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
      <div className="mb-1 flex flex-wrap items-end justify-center gap-0.5">
        {display.originalPricePerMonth ? (
          <span
            aria-label={`Original ${bundle.title.toLowerCase()} monthly price ${formatPrice(display.originalPricePerMonth)}`}
            className="mr-1 text-lg font-bold leading-7 text-neutral-400 line-through"
          >
            {formatPrice(display.originalPricePerMonth)}
          </span>
        ) : null}
        <span
          aria-label={`${bundle.title} monthly price ${formatPrice(display.pricePerMonth)}`}
          className={`font-body text-3xl font-bold leading-9 ${
            display.isWaitlistPrice ? "text-brand-primary" : "text-text-primary"
          }`}
        >
          {formatPrice(display.pricePerMonth)}
        </span>
        <span className="mb-0.5 text-sm font-medium leading-5 text-neutral-500">/mo</span>
      </div>
      <p className="text-xs font-medium leading-4 tracking-normal text-neutral-400">
        {display.originalTotalPrice ? (
          <span
            aria-label={`Original ${bundle.title.toLowerCase()} billing total ${formatPrice(display.originalTotalPrice)}`}
            className="mr-1 line-through"
          >
            {formatPrice(display.originalTotalPrice)}
          </span>
        ) : null}
        Billed as {formatPrice(display.totalPrice)}
      </p>
    </div>
  );
}

function BundleBenefits() {
  return (
    <section
      aria-labelledby="bundle-benefits-heading"
      className="mb-10 rounded-md border border-neutral-100 bg-surface-base p-8 shadow-sm md:p-10"
    >
      <h3
        className="mb-6 text-center text-sm font-semibold uppercase leading-5 tracking-wider text-neutral-400"
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
            <span className="text-sm leading-5 text-neutral-700">{benefit}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatPrice(value: number): string {
  return `$${value}`;
}
