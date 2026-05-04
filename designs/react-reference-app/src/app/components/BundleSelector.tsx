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
    <div className="w-full max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
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
              transition={{ delay: index * 0.1 }}
              onClick={() => handleSelect(bundle.id)}
              className={`relative bg-white rounded-2xl p-8 border-2 transition-all ${
                mode === 'checkout' && !disabled ? 'cursor-pointer' : ''
              } ${
                isSelected
                  ? 'border-[#C81D6B] shadow-lg shadow-[#C81D6B]/10 scale-105 z-10'
                  : hasWaitlistPrice
                    ? 'border-[#C81D6B]/30 shadow-md'
                    : 'border-neutral-100 shadow-sm hover:border-neutral-300'
              }`}
            >
              {bundle.isPopular && !hasWaitlistPrice && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#121212] text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Star size={12} className="fill-current" /> Most Popular
                </div>
              )}

              {hasWaitlistPrice && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#C81D6B] text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md">
                  {bundle.waitlistBadge}
                </div>
              )}

              {bundle.discountBadge && !hasWaitlistPrice && (
                <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-wide">
                  {bundle.discountBadge}
                </div>
              )}

              <div className="text-center mb-8 pt-4">
                <h3 className="font-serif text-2xl text-[#121212] mb-2">{bundle.title}</h3>
                <div className="flex items-end justify-center gap-1 mb-2">
                  {hasWaitlistPrice && (
                    <span className="text-2xl font-bold text-neutral-400 line-through mr-1">${bundle.pricePerMonth}</span>
                  )}
                  <span className={`text-4xl font-bold ${hasWaitlistPrice ? 'text-[#C81D6B]' : 'text-[#121212]'}`}>${displayPrice}</span>
                  <span className="text-neutral-500 font-medium mb-1">/mo</span>
                </div>
                <p className="text-sm text-neutral-500 font-medium">
                  {hasWaitlistPrice && (
                    <span className="line-through mr-1">${bundle.totalPrice}</span>
                  )}
                  Billed as one payment of ${displayTotal}
                </p>
              </div>

              <div className="w-full h-px bg-neutral-100 mb-8" />

              <ul className="space-y-4 mb-8">
                {BENEFITS.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-[#C81D6B] shrink-0 mt-0.5" />
                    <span className="text-neutral-700 text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>
              
              {mode === 'checkout' && (
                <div className={`w-6 h-6 rounded-full border-2 mx-auto flex items-center justify-center transition-colors ${
                  isSelected ? 'border-[#C81D6B] bg-[#C81D6B]' : 'border-neutral-300'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

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