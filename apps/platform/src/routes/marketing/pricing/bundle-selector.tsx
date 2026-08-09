import {
  coachingBundleBenefits,
  coachingBundles,
  resolveCoachingBundleDisplay,
  type CoachingBundle,
  type CoachingBundleWaitlistOfferPlan,
  type ResolvedCoachingBundleDisplay,
} from "@eli-coach-platform/domain";
import { cn } from "@eli-coach-platform/ui";
import { CheckCircle2, Star, Tag } from "lucide-react";
import { motion } from "motion/react";

import { createFadeUpVariants, marketingEaseOut } from "../marketing-motion";

type BundleSelectorProps = {
  waitlistOfferPlan?: CoachingBundleWaitlistOfferPlan;
  waitlistMode: boolean;
};

export function BundleSelector(props: BundleSelectorProps) {
  return (
    <section className="mx-auto w-full max-w-4xl">
      <h2 className="ui-sr-only">Coaching bundle options</h2>
      {props.waitlistMode ? (
        <div className="mb-8 flex justify-center">
          <span className="inline-flex max-w-xs items-center justify-center gap-2 rounded-pill bg-brand-secondary-soft px-4 py-1.5 text-center text-xs font-semibold leading-4 uppercase tracking-nav text-brand-secondary sm:max-w-none">
            <Tag aria-hidden="true" className="shrink-0" size={13} />
            <span className="min-w-0">Waitlist pricing — reserved for early signups</span>
          </span>
        </div>
      ) : null}
      <div className="mb-10 grid grid-cols-1 gap-x-4 gap-y-8 md:grid-cols-3">
        {coachingBundles.map((bundle, bundleIndex) => (
          <BundleCard
            bundle={bundle}
            index={bundleIndex}
            display={resolveCoachingBundleDisplay({
              bundle,
              waitlistOfferPlan: props.waitlistOfferPlan,
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
  index: number;
}) {
  const { bundle, display, index } = props;

  return (
    <motion.article
      animate="visible"
      className={cn(
        "relative rounded-md border-2 px-6 py-7 text-center",
        {
          "ui-public-bundle-card-featured": display.isPopular,
          "bg-surface-base ui-public-bundle-card-default shadow-sm": !display.isPopular,
        },
      )}
      initial="hidden"
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: {
          opacity: 1,
          transition: {
            delay: index * 0.06,
            duration: 0.45,
            ease: marketingEaseOut,
          },
          y: 0,
        },
      }}
    >
      <BundleCardBadges display={display} />
      <h3 className="mb-1 font-heading text-lg font-medium leading-7">{bundle.title}</h3>
      <BundlePrice bundle={bundle} display={display} />
    </motion.article>
  );
}

function BundleCardBadges(props: { display: ResolvedCoachingBundleDisplay }) {
  const { display } = props;

  return (
    <>
      {display.isPopular ? (
        <div className="ui-public-bundle-label ui-public-bundle-on-emphasis absolute bottom-full left-1/2 inline-flex -translate-x-1/2 translate-y-px items-center gap-1 whitespace-nowrap rounded-t-md bg-brand-secondary px-4 py-1 font-bold uppercase shadow-sm">
          <Star aria-hidden="true" className="fill-current" size={10} />
          Most Popular
        </div>
      ) : null}
      {display.badgeLabel ? (
        <div className="ui-public-bundle-savings absolute right-3 top-3 whitespace-nowrap px-1.5 py-0.5 font-bold uppercase">
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
      {display.isPopular ? (
        <div className="ui-public-bundle-featured-rule mx-auto mt-1 mb-2.5 h-px w-12" aria-hidden="true" />
      ) : null}
      <p className="ui-public-bundle-muted text-xs font-medium leading-4 tracking-normal">
        {bundle.months === 1 ? (
          "Billed monthly"
        ) : (
          <>
            {display.originalTotalPrice ? (
              <span
                aria-label={`Original ${bundle.title.toLowerCase()} billing total ${formatPrice(display.originalTotalPrice)}`}
                className="mr-1 line-through"
              >
                {formatPrice(display.originalTotalPrice)}
              </span>
            ) : null}
            Billed as {formatPrice(display.totalPrice)}
          </>
        )}
      </p>
    </div>
  );
}

function BundleBenefits() {
  return (
    <motion.section
      animate="visible"
      className="ui-public-bundle-panel mb-10 rounded-md border bg-surface-base p-8 shadow-sm md:p-10"
      initial="hidden"
      variants={createFadeUpVariants({ delay: 0.3, duration: 0.52, offset: 15 })}
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
    </motion.section>
  );
}

function formatPrice(value: number): string {
  return `€${value}`;
}
