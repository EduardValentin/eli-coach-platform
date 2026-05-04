import { useState } from 'react';
import { CheckCircle2, Star } from 'lucide-react';
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
    id: '3-months',
    title: 'Quarterly',
    months: 3,
    pricePerMonth: 250,
    totalPrice: 750
  },
  {
    id: '6-months',
    title: 'Biannual',
    months: 6,
    pricePerMonth: 220,
    totalPrice: 1320,
    discountBadge: 'Save 12%',
    isPopular: true
  },
  {
    id: '12-months',
    title: 'Annual',
    months: 12,
    pricePerMonth: 190,
    totalPrice: 2280,
    discountBadge: 'Save 24%',
    waitlistPricePerMonth: 150,
    waitlistTotalPrice: 1800,
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
    mode === 'checkout' ? '6-months' : null
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
      {/* Compact price cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {BUNDLES.map((bundle, index) => {
          const isSelected = selectedBundleId === bundle.id;
          const hasWaitlistPrice = waitlistMode && bundle.waitlistPricePerMonth != null;
          const displayPrice = hasWaitlistPrice ? bundle.waitlistPricePerMonth! : bundle.pricePerMonth;
          const displayTotal = hasWaitlistPrice ? bundle.waitlistTotalPrice! : bundle.totalPrice;

          return (
            <motion.div
              key={bundle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => handleSelect(bundle.id)}
              className={`relative bg-white rounded-2xl px-6 py-7 border-2 transition-all text-center ${
                mode === 'checkout' && !disabled ? 'cursor-pointer' : ''
              } ${
                isSelected
                  ? 'border-[#C81D6B] shadow-lg shadow-[#C81D6B]/10 scale-[1.03] z-10'
                  : hasWaitlistPrice
                    ? 'border-[#C81D6B]/30 shadow-md'
                    : 'border-neutral-100 shadow-sm hover:border-neutral-300'
              }`}
            >
              {bundle.isPopular && !hasWaitlistPrice && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#121212] text-white px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md whitespace-nowrap">
                  <Star size={10} className="fill-current" /> Most Popular
                </div>
              )}

              {hasWaitlistPrice && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#C81D6B] text-white px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-md whitespace-nowrap">
                  {bundle.waitlistBadge}
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
                  <span className="text-lg font-bold text-neutral-400 line-through mr-1">${bundle.pricePerMonth}</span>
                )}
                <span className={`text-3xl font-bold ${hasWaitlistPrice ? 'text-[#C81D6B]' : 'text-[#121212]'}`}>
                  ${displayPrice}
                </span>
                <span className="text-neutral-500 text-sm font-medium mb-0.5">/mo</span>
              </div>

              <p className="text-xs text-neutral-400 font-medium">
                {hasWaitlistPrice && (
                  <span className="line-through mr-1">${bundle.totalPrice}</span>
                )}
                Billed as ${displayTotal}
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
