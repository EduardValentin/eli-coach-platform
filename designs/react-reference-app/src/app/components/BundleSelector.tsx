import { useState } from 'react';
import { CheckCircle2, Star, Tag } from 'lucide-react';
import { motion } from 'motion/react';

export type Bundle = {
  id: string;
  title: string;
  months: number;
  pricePerMonth: number;
  totalPrice: number;
  isPopular?: boolean;
  waitlistPricePerMonth?: number;
  waitlistTotalPrice?: number;
  waitlistBadge?: string;
};

const BUNDLES: Bundle[] = [
  {
    id: '1-month',
    title: '1 Month',
    months: 1,
    pricePerMonth: 159,
    totalPrice: 159,
    waitlistPricePerMonth: 139,
    waitlistTotalPrice: 139,
    waitlistBadge: 'Waitlist price',
  },
  {
    id: '3-months',
    title: '3 Months',
    months: 3,
    pricePerMonth: 149,
    totalPrice: 447,
    isPopular: true,
    waitlistPricePerMonth: 125,
    waitlistTotalPrice: 375,
    waitlistBadge: 'Waitlist price',
  },
  {
    id: '6-months',
    title: '6 Months',
    months: 6,
    pricePerMonth: 139,
    totalPrice: 834,
    waitlistPricePerMonth: 119,
    waitlistTotalPrice: 714,
    waitlistBadge: 'Waitlist price',
  }
];

const BENEFITS = [
  "Personalized workout and nutrition program",
  "Periodic progress check-ins",
  "Uninterrupted support with your coach",
  "Video form review and correction",
  "Access to the private community"
];

interface BundleSelectorProps {
  mode: 'public' | 'checkout';
  onCheckout?: (bundleId: string) => void;
  disabled?: boolean;
  waitlistMode?: boolean;
}

export function BundleSelector({ mode, onCheckout, disabled = false, waitlistMode = false }: BundleSelectorProps) {
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(
    mode === 'checkout' ? '3-months' : null
  );

  const handleSelect = (id: string) => {
    if (mode === 'checkout' && !disabled) {
      setSelectedBundleId(id);
    }
  };

  const handleCheckoutClick = () => {
    if (selectedBundleId && onCheckout) {
      onCheckout(selectedBundleId);
    }
  };

  // Per-month price of the 1-month plan in the current mode — the baseline
  // that the multi-month "Save X%" badges are calculated against.
  const oneMonth = BUNDLES.find((b) => b.months === 1);
  const baselinePerMonth = oneMonth
    ? (waitlistMode && oneMonth.waitlistPricePerMonth != null
        ? oneMonth.waitlistPricePerMonth
        : oneMonth.pricePerMonth)
    : null;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {waitlistMode && (
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-secondary-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-nav text-brand-secondary">
            <Tag size={13} aria-hidden="true" /> Waitlist pricing — reserved for early signups
          </span>
        </div>
      )}

      {/* Compact price cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-8 mb-10">
        {BUNDLES.map((bundle, index) => {
          const isSelected = selectedBundleId === bundle.id;
          const hasWaitlistPrice = waitlistMode && bundle.waitlistPricePerMonth != null;
          const displayPrice = hasWaitlistPrice ? bundle.waitlistPricePerMonth! : bundle.pricePerMonth;
          const displayTotal = hasWaitlistPrice ? bundle.waitlistTotalPrice! : bundle.totalPrice;
          const savingsPct = baselinePerMonth != null && bundle.months > 1
            ? Math.floor(((baselinePerMonth - displayPrice) / baselinePerMonth) * 100)
            : 0;

          return (
            <motion.div
              key={bundle.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => handleSelect(bundle.id)}
              className={`relative rounded-2xl px-6 py-7 border-2 text-center ${
                bundle.isPopular ? 'bg-[color-mix(in_srgb,var(--brand-secondary)_5%,var(--card))]' : 'bg-card'
              } ${
                mode === 'checkout' ? 'transition-[border-color,box-shadow,transform]' : 'transition-[border-color,box-shadow]'
              } ${
                mode === 'checkout' && !disabled ? 'cursor-pointer' : ''
              } ${
                isSelected
                  ? 'border-brand shadow-lg shadow-[color-mix(in_srgb,var(--brand)_10%,transparent)] scale-[1.03] z-10'
                  : bundle.isPopular
                    ? 'border-[color-mix(in_srgb,var(--brand-secondary)_50%,transparent)] shadow-[0_20px_50px_-16px_color-mix(in_srgb,var(--brand-secondary)_30%,transparent)] z-10'
                    : 'border-stroke-faint shadow-sm hover:border-[color-mix(in_srgb,var(--muted-foreground)_40%,transparent)]'
              }`}
            >
              {bundle.isPopular && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px bg-brand-secondary text-brand-secondary-foreground px-4 py-1 rounded-t-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm whitespace-nowrap">
                  <Star size={10} className="fill-current" /> Most Popular
                </div>
              )}

              {savingsPct > 0 && (
                <div className="absolute top-3 right-3 bg-savings-badge-surface text-savings-badge-text px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-nav">
                  Save {savingsPct}%
                </div>
              )}

              <h3 className="font-serif text-lg text-foreground mb-1">{bundle.title}</h3>

              <div className="flex items-end justify-center gap-0.5 mb-1">
                {hasWaitlistPrice && (
                  <span className="text-lg font-bold text-bundle-muted line-through mr-1">€{bundle.pricePerMonth}</span>
                )}
                <span className={`text-3xl font-bold ${hasWaitlistPrice ? 'text-brand' : 'text-foreground'}`}>
                  €{displayPrice}
                </span>
                <span className="text-bundle-secondary text-sm font-medium mb-0.5">/mo</span>
              </div>

              {bundle.isPopular && (
                <div className="mx-auto mt-1 mb-2.5 h-px w-12 bg-[color-mix(in_srgb,var(--brand-secondary)_50%,transparent)]" aria-hidden="true" />
              )}

              <p className="text-xs text-bundle-muted font-medium">
                {bundle.months === 1 ? (
                  'Billed monthly'
                ) : (
                  <>
                    {hasWaitlistPrice && (
                      <span className="line-through mr-1">€{bundle.totalPrice}</span>
                    )}
                    Billed as €{displayTotal}
                  </>
                )}
              </p>

              {mode === 'checkout' && (
                <div className={`w-5 h-5 rounded-full border-2 mx-auto mt-4 flex items-center justify-center transition-colors ${
                  isSelected ? 'border-brand bg-brand' : 'border-control-border-soft'
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-brand-foreground" />}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Shared benefits section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-2xl border border-stroke-faint shadow-sm p-8 md:p-10 mb-10"
      >
        <h4 className="text-sm font-semibold uppercase tracking-wider text-bundle-muted mb-6 text-center">
          What's included in every plan
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 max-w-2xl mx-auto">
          {BENEFITS.map((benefit, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-brand shrink-0 mt-0.5" />
              <span className="text-bundle-secondary text-sm">{benefit}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      {mode === 'checkout' && !disabled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <button
            onClick={handleCheckoutClick}
            disabled={!selectedBundleId}
            className="px-12 py-4 bg-foreground text-background text-lg font-medium rounded-sm hover:bg-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            Continue to Checkout
          </button>
        </motion.div>
      )}
    </div>
  );
}
