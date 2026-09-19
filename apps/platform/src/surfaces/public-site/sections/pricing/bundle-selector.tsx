import { cn } from "@eli-coach-platform/ui/lib";
import {
  createFadeUpVariants,
  publicEaseOut,
} from "@eli-coach-platform/ui/motion";
import { CheckCircle2, Star, Tag } from "lucide-react";
import { motion } from "motion/react";

import type { CoachingBundleCard } from "./coaching-bundles";

type BundleSelectorProps = {
  benefits: readonly string[];
  cards: readonly CoachingBundleCard[];
  showsWaitlistPricing: boolean;
};

export function BundleSelector(props: BundleSelectorProps) {
  return (
    <section className="mx-auto w-full max-w-4xl">
      <h2 className="ui-sr-only">Coaching bundle options</h2>
      {props.showsWaitlistPricing ? (
        <div className="mb-8 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-secondary-soft px-4 py-1.5 text-xs font-semibold tracking-nav text-brand-secondary uppercase">
            <Tag aria-hidden="true" size={13} /> Waitlist pricing — reserved for
            early signups
          </span>
        </div>
      ) : null}
      <div className="mb-10 grid grid-cols-1 gap-x-4 gap-y-8 md:grid-cols-3">
        {props.cards.map((card, cardIndex) => (
          <BundleCard card={card} index={cardIndex} key={card.id} />
        ))}
      </div>
      <BundleBenefits benefits={props.benefits} />
    </section>
  );
}

function BundleCard(props: { card: CoachingBundleCard; index: number }) {
  const { card, index } = props;

  return (
    <motion.article
      animate="visible"
      className={cn("relative rounded-card border-2 px-6 py-7 text-center", {
        "ui-public-bundle-card-featured z-10 shadow-(--ui-public-bundle-featured-shadow)":
          card.isPopular,
        "bg-surface-base ui-public-bundle-card-default shadow-card":
          !card.isPopular,
      })}
      initial="hidden"
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: {
          opacity: 1,
          transition: {
            delay: index * 0.06,
            duration: 0.45,
            ease: publicEaseOut,
          },
          y: 0,
        },
      }}
    >
      <BundleCardBadges card={card} />
      <h3 className="mb-1 font-heading text-lg font-medium leading-7">
        {card.title}
      </h3>
      <BundlePrice card={card} />
    </motion.article>
  );
}

function BundleCardBadges(props: { card: CoachingBundleCard }) {
  const { card } = props;

  return (
    <>
      {card.isPopular ? (
        <div className="ui-public-bundle-label ui-public-bundle-on-emphasis absolute bottom-full left-1/2 inline-flex -mb-px -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-t-compact bg-brand-secondary px-4 py-1 font-bold uppercase shadow-card">
          <Star aria-hidden="true" className="fill-current" size={10} />
          Most Popular
        </div>
      ) : null}
      {card.savingsPercent ? (
        <div className="ui-public-bundle-savings absolute right-3 top-3 px-1.5 py-0.5 font-bold uppercase">
          Save {card.savingsPercent}%
        </div>
      ) : null}
    </>
  );
}

function BundlePrice(props: { card: CoachingBundleCard }) {
  const { card } = props;
  const titleLower = card.title.toLowerCase();

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-end justify-center gap-0.5">
        {card.originalPricePerMonth ? (
          <span
            aria-label={`Original ${titleLower} monthly price ${formatEuros(card.originalPricePerMonth)}`}
            className="ui-public-bundle-muted mr-1 text-lg font-bold leading-7 line-through"
          >
            <Euros amount={card.originalPricePerMonth} />
          </span>
        ) : null}
        <span
          aria-label={`${card.title} monthly price ${formatEuros(card.pricePerMonth)}`}
          className={cn("font-body text-3xl font-bold leading-9", {
            "text-brand-primary": card.isWaitlistPrice,
          })}
        >
          <Euros amount={card.pricePerMonth} />
        </span>
        <span className="mb-0.5 text-sm font-medium leading-5 text-link-muted">
          /mo
        </span>
      </div>
      {card.isPopular ? (
        <div
          className="ui-public-bundle-featured-rule mx-auto mt-1 mb-2.5 h-px w-12"
          aria-hidden="true"
        />
      ) : null}
      <p className="ui-public-bundle-muted text-xs font-medium leading-4 tracking-normal">
        {card.originalTotal ? (
          <span
            aria-label={`Original ${titleLower} billing total ${formatEuros(card.originalTotal)}`}
            className="mr-1 line-through"
          >
            <Euros amount={card.originalTotal} />
          </span>
        ) : null}
        {card.billedMonthly ? "Billed monthly" : <>Billed as €{card.total}</>}
      </p>
    </div>
  );
}

function formatEuros(amount: number): string {
  return `€${amount}`;
}

function Euros(props: { amount: number }) {
  return <>€{props.amount}</>;
}

function BundleBenefits(props: { benefits: readonly string[] }) {
  return (
    <motion.section
      animate="visible"
      className="ui-public-bundle-panel mb-10 rounded-card border bg-surface-base p-8 shadow-card md:p-10"
      initial="hidden"
      variants={createFadeUpVariants({
        delay: 0.3,
        duration: 0.52,
        offset: 15,
      })}
    >
      <h4 className="ui-public-bundle-benefits-heading ui-public-bundle-muted mb-6 text-center text-sm font-semibold uppercase leading-5">
        What's included in every plan
      </h4>
      <ul className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        {props.benefits.map((benefit) => (
          <li className="flex items-start gap-3" key={benefit}>
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-brand-primary"
              size={18}
            />
            <span className="text-sm leading-5 text-link-muted">{benefit}</span>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
