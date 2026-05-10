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
    <section className="mx-auto w-full max-w-4xl">
      <h2 className="ui-sr-only">Coaching bundle options</h2>
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
      className={cn(
        "ui-public-bundle-card-enter relative rounded-md border-2 bg-surface-base px-6 py-7 text-center shadow-sm transition-all",
        {
          "border-brand-primary/30 shadow-md": display.isWaitlistPrice,
          "ui-public-bundle-card-default": !display.isWaitlistPrice,
        },
      )}
    >
      <BundleCardBadges display={display} />
      <h3 className="mb-1 font-heading text-lg font-medium leading-7">{bundle.title}</h3>
      <BundlePrice bundle={bundle} display={display} />
    </article>
  );
}

function BundleCardBadges(props: { display: ResolvedCoachingBundleDisplay }) {
  const { display } = props;

  return (
    <>
      {display.isPopular ? (
        <div className="ui-public-bundle-label ui-public-bundle-on-emphasis absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-pill bg-text-primary px-3 py-0.5 font-bold uppercase shadow-md">
          <Star aria-hidden="true" className="fill-current" size={10} />
          Most Popular
        </div>
      ) : null}
      {display.badgeLabel ? (
        <div
          className={cn("absolute whitespace-nowrap font-bold uppercase", {
            "ui-public-bundle-label ui-public-bundle-on-emphasis -top-3.5 left-1/2 -translate-x-1/2 rounded-pill bg-brand-primary px-3 py-0.5 shadow-md":
              display.isWaitlistPrice,
            "ui-public-bundle-savings right-3 top-3 px-1.5 py-0.5":
              !display.isWaitlistPrice,
          })}
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
            className="ui-public-bundle-muted mr-1 text-lg font-bold leading-7 line-through"
          >
            {formatPrice(display.originalPricePerMonth)}
          </span>
        ) : null}
        <span
          aria-label={`${bundle.title} monthly price ${formatPrice(display.pricePerMonth)}`}
          className={cn("font-body text-3xl font-bold leading-9", {
            "text-brand-primary": display.isWaitlistPrice,
          })}
        >
          {formatPrice(display.pricePerMonth)}
        </span>
        <span className="ui-public-bundle-secondary mb-0.5 text-sm font-medium leading-5">/mo</span>
      </div>
      <p className="ui-public-bundle-muted text-xs font-medium leading-4 tracking-normal">
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
      className="ui-public-bundle-benefits-enter ui-public-bundle-panel mb-10 rounded-md border bg-surface-base p-8 shadow-sm md:p-10"
    >
      <h3 className="ui-public-bundle-benefits-heading ui-public-bundle-muted mb-6 text-center text-sm font-semibold uppercase leading-5">
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
            <span className="ui-public-bundle-secondary text-sm leading-5">{benefit}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatPrice(value: number): string {
  return `$${value}`;
}
