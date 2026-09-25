import { useState, type ReactNode } from 'react';
import { CheckCircle2, Star, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from './ThemeButton';
import { cardVariants } from './ui/card';
import {
  bundlePerMonth,
  bundleTotal,
  COACHING_BUNDLES,
  DEFAULT_BUNDLE_ID,
  type BundleId,
} from '../domain/bundles';

export type BundleSelectorPricing = 'regular' | 'waitlist' | 'reduced';

const PRICING_BANNERS: Partial<Record<BundleSelectorPricing, string>> = {
  waitlist: 'Waitlist pricing — reserved for early signups',
  reduced: 'Your reduced price — held for you',
};

const BENEFITS = [
  "Personalized workout and nutrition program",
  "2 live training sessions per month",
  "Periodic progress check-ins",
  "Uninterrupted support with your coach",
  "Video form review and correction",
  "Access to the private community"
];

interface BundleSelectorProps {
  mode: 'public' | 'checkout';
  pricing?: BundleSelectorPricing;
  onCheckout?: (bundleId: BundleId) => void;
  disabled?: boolean;
  busy?: boolean;
  note?: ReactNode;
  beforeCheckout?: ReactNode;
}

export function BundleSelector({
  mode,
  pricing = 'regular',
  onCheckout,
  disabled = false,
  busy = false,
  note,
  beforeCheckout,
}: BundleSelectorProps) {
  const [selectedBundleId, setSelectedBundleId] = useState<BundleId | null>(
    mode === 'checkout' ? DEFAULT_BUNDLE_ID : null
  );

  const handleSelect = (id: BundleId) => {
    if (mode === 'checkout' && !disabled) {
      setSelectedBundleId(id);
    }
  };

  const handleCheckoutClick = () => {
    if (selectedBundleId && onCheckout) {
      onCheckout(selectedBundleId);
    }
  };

  const banner = PRICING_BANNERS[pricing];
  const journeyPricing = pricing === 'regular' ? 'regular' : 'reduced';
  const isDiscounted = journeyPricing === 'reduced';

  const oneMonth = COACHING_BUNDLES.find((b) => b.months === 1);
  const baselinePerMonth = oneMonth
    ? bundlePerMonth(oneMonth, journeyPricing)
    : null;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {banner && (
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-secondary-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-secondary">
            <Tag size={13} aria-hidden="true" /> {banner}
          </span>
        </div>
      )}

      {note && (
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-copy-muted">
          {note}
        </p>
      )}

      {/* Compact price cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-8 mb-10">
        {COACHING_BUNDLES.map((bundle, index) => {
          const isSelected = selectedBundleId === bundle.id;
          const displayPrice = bundlePerMonth(bundle, journeyPricing);
          const displayTotal = bundleTotal(bundle, journeyPricing);
          const regularTotal = bundleTotal(bundle, 'regular');
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
              className={`relative rounded-card px-6 py-7 border-2 text-center ${
                bundle.popular ? 'bg-[color-mix(in_srgb,var(--brand-secondary)_5%,var(--card))]' : 'bg-card'
              } ${
                mode === 'checkout' ? 'transition-[border-color,box-shadow,transform]' : 'transition-[border-color,box-shadow]'
              } ${
                mode === 'checkout' && !disabled ? 'cursor-pointer' : ''
              } ${
                isSelected
                  ? 'border-brand shadow-lg shadow-[color-mix(in_srgb,var(--brand)_10%,transparent)] scale-[1.03] z-10'
                  : bundle.popular
                    ? 'border-[color-mix(in_srgb,var(--brand-secondary)_50%,transparent)] shadow-[0_20px_50px_-16px_color-mix(in_srgb,var(--brand-secondary)_30%,transparent)] z-10'
                    : 'border-stroke-faint shadow-card hover:border-[color-mix(in_srgb,var(--muted-foreground)_40%,transparent)]'
              }`}
            >
              {bundle.popular && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px bg-brand-secondary text-brand-secondary-foreground px-4 py-1 rounded-t-compact text-caption font-bold uppercase tracking-wider flex items-center gap-1 shadow-card whitespace-nowrap">
                  <Star size={10} className="fill-current" /> Most Popular
                </div>
              )}

              {savingsPct > 0 && (
                <div className="absolute top-3 right-3 bg-savings-badge-surface text-savings-badge-text px-1.5 py-0.5 rounded-tile text-micro font-bold uppercase tracking-wide">
                  Save {savingsPct}%
                </div>
              )}

              <h3 className="font-serif text-lg text-foreground mb-1">{bundle.title}</h3>

              <div className="flex items-end justify-center gap-0.5 mb-1">
                {isDiscounted && (
                  <span className="text-lg font-bold text-bundle-muted line-through mr-1">€{bundle.regularPerMonth}</span>
                )}
                <span className={`text-3xl font-bold ${isDiscounted ? 'text-brand' : 'text-foreground'}`}>
                  €{displayPrice}
                </span>
                <span className="text-link-muted text-sm font-medium mb-0.5">/mo</span>
              </div>

              {bundle.popular && (
                <div className="mx-auto mt-1 mb-2.5 h-px w-12 bg-[color-mix(in_srgb,var(--brand-secondary)_50%,transparent)]" aria-hidden="true" />
              )}

              <p className="text-xs text-bundle-muted font-medium">
                {bundle.months === 1 ? (
                  'Billed monthly'
                ) : (
                  <>
                    {isDiscounted && (
                      <span className="line-through mr-1">€{regularTotal}</span>
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
        className={cn(cardVariants(), 'p-8 md:p-10 mb-10')}
      >
        <h4 className="text-sm font-semibold uppercase tracking-wider text-bundle-muted mb-6 text-center">
          What's included in every plan
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 max-w-2xl mx-auto">
          {BENEFITS.map((benefit, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-brand shrink-0 mt-0.5" />
              <span className="text-link-muted text-sm">{benefit}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      {mode === 'checkout' && !disabled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center"
        >
          {beforeCheckout && (
            <div className="mb-8 w-full max-w-xl">{beforeCheckout}</div>
          )}

          <button
            onClick={handleCheckoutClick}
            disabled={!selectedBundleId || busy}
            aria-busy={busy}
            className="px-12 py-4 bg-foreground text-background text-lg font-medium rounded-control hover:bg-brand transition-colors shadow-action hover:shadow-action-hover disabled:pointer-events-none disabled:opacity-50"
          >
            {busy ? 'Opening checkout…' : 'Continue to Checkout'}
          </button>

        </motion.div>
      )}
    </div>
  );
}
