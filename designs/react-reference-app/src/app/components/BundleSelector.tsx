import { useState } from 'react';
import { CheckCircle2, Star, Tag } from 'lucide-react';
import { motion } from 'motion/react';

export type Bundle = {
  id: string;
  title: string;
  months: number;
  pricePerMonth: number;
  totalPrice: number;
  discountBadge?: string;
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
    discountBadge: 'Save 6%',
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
    discountBadge: 'Save 12%',
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

  return (
    <div className="w-full max-w-4xl mx-auto">
      {waitlistMode && (
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#00796B]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#00796B]">
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

          return (
            <motion.div
              key={bundle.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => handleSelect(bundle.id)}
              className={`relative rounded-2xl px-6 py-7 border-2 text-center ${
                bundle.isPopular ? 'bg-[#F2FAF8]' : 'bg-white'
              } ${
                mode === 'checkout' ? 'transition-[border-color,box-shadow,transform]' : 'transition-[border-color,box-shadow]'
              } ${
                mode === 'checkout' && !disabled ? 'cursor-pointer' : ''
              } ${
                isSelected
                  ? 'border-[#C81D6B] shadow-lg shadow-[#C81D6B]/10 scale-[1.03] z-10'
                  : bundle.isPopular
                    ? 'border-[#00796B]/50 shadow-[0_20px_50px_-16px_rgba(0,121,107,0.30)] z-10'
                    : 'border-neutral-100 shadow-sm hover:border-neutral-300'
              }`}
            >
              {bundle.isPopular && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px bg-[#00796B] text-white px-4 py-1 rounded-t-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm whitespace-nowrap">
                  <Star size={10} className="fill-current" /> Most Popular
                </div>
              )}

              {bundle.discountBadge && !hasWaitlistPrice && (
                <div className="absolute top-3 right-3 bg-green-100 text-green-700 px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wide">
                  {bundle.discountBadge}
                </div>
              )}

              <h3 className="font-serif text-lg text-[#121212] mb-1">{bundle.title}</h3>

              <div className="flex items-end justify-center gap-0.5 mb-1">
                {hasWaitlistPrice && (
                  <span className="text-lg font-bold text-neutral-400 line-through mr-1">€{bundle.pricePerMonth}</span>
                )}
                <span className={`text-3xl font-bold ${hasWaitlistPrice ? 'text-[#C81D6B]' : 'text-[#121212]'}`}>
                  €{displayPrice}
                </span>
                <span className="text-neutral-500 text-sm font-medium mb-0.5">/mo</span>
              </div>

              {bundle.isPopular && (
                <div className="mx-auto mt-1 mb-2.5 h-px w-12 bg-[#00796B]/50" aria-hidden="true" />
              )}

              <p className="text-xs text-neutral-400 font-medium">
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
                  isSelected ? 'border-[#C81D6B] bg-[#C81D6B]' : 'border-neutral-300'
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
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
        className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 md:p-10 mb-10"
      >
        <h4 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-6 text-center">
          What's included in every plan
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 max-w-2xl mx-auto">
          {BENEFITS.map((benefit, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-[#C81D6B] shrink-0 mt-0.5" />
              <span className="text-neutral-700 text-sm">{benefit}</span>
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
            className="px-12 py-4 bg-[#121212] text-white text-lg font-medium rounded-sm hover:bg-[#C81D6B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            Continue to Checkout
          </button>
        </motion.div>
      )}
    </div>
  );
}
