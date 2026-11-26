type BrandMarkAppearance = 'solid' | 'transparent';

const OUTLINE_CLASS: Record<BrandMarkAppearance, string> = {
  solid: 'border-brand',
  transparent: 'border-current',
};

const CORE_CLASS: Record<BrandMarkAppearance, string> = {
  solid: 'bg-brand',
  transparent: 'bg-current',
};

export function BrandMark({ appearance = 'solid' }: { appearance?: BrandMarkAppearance }) {
  return (
    <span
      aria-hidden="true"
      data-parity="brand-mark"
      className={`w-8 h-8 shrink-0 flex items-center justify-center border-2 rounded-tile transform rotate-45 transition-colors ${OUTLINE_CLASS[appearance]}`}
    >
      <span
        className={`block w-3 h-3 transform -rotate-45 transition-colors ${CORE_CLASS[appearance]}`}
      />
    </span>
  );
}
