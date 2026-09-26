import type { CoachingBundleId } from "@eli-coach-platform/domain/coaching-bundle";
import { cn } from "@eli-coach-platform/ui/lib";
import { publicEaseOut } from "@eli-coach-platform/ui/motion";
import { Star } from "lucide-react";
import { motion } from "motion/react";
import { useId } from "react";

import {
  formatEuros,
  type CoachingBundleCard,
} from "~/features/coaching-sales/contracts/bundle-cards";

type BundleChoice = {
  isDisabled: boolean;
  isSelected: boolean;
  onChoose: (bundleId: CoachingBundleId) => void;
};

type BundleCardProps = {
  card: CoachingBundleCard;
  choice?: BundleChoice;
  index: number;
};

const EURO_SIGN = "€";

export function BundleCard(props: BundleCardProps) {
  const { card, choice, index } = props;
  const isSelected = choice?.isSelected ?? false;
  const priceId = useId();

  return (
    <motion.article
      animate="visible"
      className={cn("relative rounded-card border-2 px-6 py-7 text-center", {
        "ui-public-bundle-card-featured": card.isPopular,
        "bg-surface-base": !card.isPopular,
        "transition-[border-color,box-shadow]": !choice,
        "transition-[border-color,box-shadow,transform]": choice,
        "cursor-pointer": choice && !choice.isDisabled,
        "ui-public-bundle-card-selected z-10 scale-[1.03] shadow-lg shadow-(color:--ui-public-bundle-selected-shadow-color)":
          isSelected,
        "z-10 shadow-(--ui-public-bundle-featured-shadow)":
          !isSelected && card.isPopular,
        "ui-public-bundle-card-default shadow-card":
          !isSelected && !card.isPopular,
      })}
      data-chip-control={choice ? "" : undefined}
      data-parity={`bundle-${card.id}`}
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
      <BundlePrice card={card} priceId={priceId} />
      {choice ? (
        <BundleChoiceControl card={card} choice={choice} priceId={priceId} />
      ) : null}
    </motion.article>
  );
}

function BundleChoiceControl(props: {
  card: CoachingBundleCard;
  choice: BundleChoice;
  priceId: string;
}) {
  const { card, choice, priceId } = props;
  const inputId = useId();

  return (
    <>
      <input
        aria-describedby={priceId}
        checked={choice.isSelected}
        className="ui-sr-only"
        disabled={choice.isDisabled}
        id={inputId}
        name="bundleId"
        onChange={() => choice.onChoose(card.id)}
        type="radio"
        value={card.id}
      />
      <span
        aria-hidden="true"
        className={cn(
          "mx-auto mt-4 flex size-5 items-center justify-center rounded-full border-2 transition-colors",
          {
            "border-brand-primary bg-brand-primary": choice.isSelected,
            "border-control-border-soft": !choice.isSelected,
          },
        )}
      >
        {choice.isSelected ? (
          <span className="size-1.5 rounded-full bg-brand-primary-foreground" />
        ) : null}
      </span>
      <label className="absolute inset-0 rounded-card" htmlFor={inputId}>
        <span className="ui-sr-only">{card.title}</span>
      </label>
    </>
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
        <div className="ui-public-bundle-savings absolute right-3 top-3 px-1.5 py-0.5 font-bold uppercase tracking-wide">
          Save {card.savingsPercent}%
        </div>
      ) : null}
    </>
  );
}

function BundlePrice(props: { card: CoachingBundleCard; priceId: string }) {
  const { card, priceId } = props;
  const titleLower = card.title.toLowerCase();

  return (
    <div id={priceId}>
      <div
        className="mb-1 flex flex-wrap items-end justify-center gap-0.5"
        data-parity={`price-${card.id}`}
      >
        {card.originalPricePerMonth ? (
          <span
            aria-label={`Original ${titleLower} monthly price ${formatEuros(card.originalPricePerMonth)}`}
            className="ui-public-bundle-muted mr-1 text-lg font-bold leading-7 line-through"
          >
            <EuroAmount amount={card.originalPricePerMonth} />
          </span>
        ) : null}
        <span
          aria-label={`${card.title} monthly price ${formatEuros(card.pricePerMonth)}`}
          className={cn("font-body text-3xl font-bold leading-9", {
            "text-brand-primary": card.isReducedPrice,
          })}
        >
          <EuroAmount amount={card.pricePerMonth} />
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
      <p
        className="ui-public-bundle-muted text-xs font-medium leading-4 tracking-normal"
        data-parity={`billed-${card.id}`}
      >
        {card.originalTotal ? (
          <span
            aria-label={`Original ${titleLower} billing total ${formatEuros(card.originalTotal)}`}
            className="mr-1 line-through"
          >
            <EuroAmount amount={card.originalTotal} />
          </span>
        ) : null}
        {card.billedMonthly ? (
          "Billed monthly"
        ) : (
          <EuroAmount amount={card.total} precedingText="Billed as " />
        )}
      </p>
    </div>
  );
}

function EuroAmount(props: { amount: number; precedingText?: string }) {
  return (
    <>
      {`${props.precedingText ?? ""}${EURO_SIGN}`}
      {props.amount}
    </>
  );
}
