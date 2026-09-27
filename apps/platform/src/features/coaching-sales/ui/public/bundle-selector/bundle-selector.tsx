import type { CoachingBundleId } from "@eli-coach-platform/domain/coaching-bundle";
import { buttonVariants } from "@eli-coach-platform/ui/primitives";
import { Tag } from "lucide-react";
import { motion } from "motion/react";
import { useId, type ReactNode } from "react";

import type { CoachingBundleCard } from "~/features/coaching-sales/contracts/bundle-cards";

import { BundleBenefits } from "./bundle-benefits";
import { BundleCard } from "./bundle-card";

type BundleSelectorPricing = "regular" | "waitlist" | "reduced";

type PublicBundleSelectorProps = {
  cards: readonly CoachingBundleCard[];
  mode: "public";
  pricing?: BundleSelectorPricing;
};

type CheckoutBundleSelectorProps = {
  beforeCheckout?: ReactNode;
  busy?: boolean;
  cards: readonly CoachingBundleCard[];
  disabled?: boolean;
  mode: "checkout";
  note?: ReactNode;
  onChooseBundle: (bundleId: CoachingBundleId) => void;
  pricing?: BundleSelectorPricing;
  selectedBundleId: CoachingBundleId | null;
};

type BundleSelectorProps =
  PublicBundleSelectorProps | CheckoutBundleSelectorProps;

const PRICING_BANNERS: Partial<Record<BundleSelectorPricing, string>> = {
  waitlist: "Waitlist pricing — reserved for early signups",
  reduced: "Your reduced price — held for you",
};

export function BundleSelector(props: BundleSelectorProps) {
  const headingId = useId();
  const banner = PRICING_BANNERS[props.pricing ?? "regular"];
  const checkout = props.mode === "checkout" ? props : null;

  return (
    <div className="mx-auto w-full max-w-4xl" data-parity-root="BundleSelector">
      <h2 className="ui-sr-only" id={headingId}>
        Coaching bundle options
      </h2>
      {banner ? (
        <div className="mb-8 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-secondary-soft px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-secondary uppercase">
            <Tag aria-hidden="true" size={13} /> {banner}
          </span>
        </div>
      ) : null}
      {checkout?.note ? (
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-copy-muted">
          {checkout.note}
        </p>
      ) : null}
      <div
        aria-labelledby={checkout ? headingId : undefined}
        className="mb-10 grid grid-cols-1 gap-x-4 gap-y-8 md:grid-cols-3"
        role={checkout ? "radiogroup" : undefined}
      >
        {props.cards.map((card, cardIndex) => (
          <BundleCard
            card={card}
            choice={
              checkout
                ? {
                    isDisabled: checkout.disabled ?? false,
                    isSelected: checkout.selectedBundleId === card.id,
                    onChoose: checkout.onChooseBundle,
                  }
                : undefined
            }
            index={cardIndex}
            key={card.id}
          />
        ))}
      </div>
      <BundleBenefits />
      {checkout && !checkout.disabled ? (
        <CheckoutAction checkout={checkout} />
      ) : null}
    </div>
  );
}

function CheckoutAction(props: { checkout: CheckoutBundleSelectorProps }) {
  const { beforeCheckout, busy, selectedBundleId } = props.checkout;

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="flex flex-col items-center"
      initial={{ opacity: 0 }}
      transition={{ delay: 0.4 }}
    >
      {beforeCheckout ? (
        <div className="mb-8 w-full max-w-xl">{beforeCheckout}</div>
      ) : null}
      <button
        aria-busy={busy}
        className={buttonVariants({
          corner: "control",
          elevation: "raised",
          size: "xl",
          variant: "ink",
        })}
        data-parity="continue"
        disabled={!selectedBundleId || busy}
        type="submit"
      >
        {busy ? "Opening checkout…" : "Continue to Checkout"}
      </button>
    </motion.div>
  );
}
