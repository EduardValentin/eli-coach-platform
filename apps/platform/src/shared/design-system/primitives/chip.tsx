import { cva, type VariantProps } from "class-variance-authority";

const CHIP_FILLED_SURFACE = "border-control-border-soft bg-surface-base py-2";

export const chipVariants = cva(
  "inline-flex items-center rounded-full border text-text-primary outline-none",
  {
    variants: {
      tone: {
        primary: `${CHIP_FILLED_SURFACE} data-[state=off]:hover:border-primary data-[state=off]:hover:text-primary data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground`,
        "brand-secondary": `${CHIP_FILLED_SURFACE} data-[state=off]:hover:border-brand-secondary data-[state=off]:hover:text-brand-secondary data-[state=on]:border-brand-secondary data-[state=on]:bg-brand-secondary data-[state=on]:text-brand-secondary-foreground`,
        checkbox:
          "data-[state=off]:border-border-default data-[state=off]:text-text-muted data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
      },
      size: {
        touch:
          "min-h-11 px-4 text-sm transition-[background-color,border-color,color] duration-150 ease-out",
        compact:
          "h-8 min-w-8 cursor-pointer gap-2 px-3 text-center text-xs font-medium whitespace-nowrap transition-[color,box-shadow]",
      },
    },
    compoundVariants: [
      {
        tone: "checkbox",
        size: "touch",
        class:
          "min-w-11 font-semibold data-[state=off]:hover:border-primary data-[state=off]:hover:text-primary data-[state=on]:hover:bg-primary-hover",
      },
      {
        tone: "checkbox",
        size: "compact",
        class:
          "data-[state=off]:has-focus-visible:border-focus-ring data-[state=off]:hover:bg-primary-soft data-[state=off]:hover:text-primary",
      },
    ],
    defaultVariants: {
      tone: "primary",
      size: "touch",
    },
  },
);

export type ChipTone = NonNullable<VariantProps<typeof chipVariants>["tone"]>;
export type ChipSize = NonNullable<VariantProps<typeof chipVariants>["size"]>;
