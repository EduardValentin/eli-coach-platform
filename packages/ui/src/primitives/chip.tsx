import { cva, type VariantProps } from "class-variance-authority";

const CHIP_FILLED_SURFACE = "border-control-border-soft bg-surface-base py-2";

export const chipVariants = cva(
  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm text-text-primary outline-none transition-[background-color,border-color,color] duration-150 ease-out",
  {
    variants: {
      tone: {
        primary: `${CHIP_FILLED_SURFACE} data-[state=off]:hover:border-primary data-[state=off]:hover:text-primary data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground`,
        "brand-secondary": `${CHIP_FILLED_SURFACE} data-[state=off]:hover:border-brand-secondary data-[state=off]:hover:text-brand-secondary data-[state=on]:border-brand-secondary data-[state=on]:bg-brand-secondary data-[state=on]:text-brand-secondary-foreground`,
        checkbox:
          "min-w-11 font-semibold data-[state=off]:border-border-default data-[state=off]:text-text-muted data-[state=off]:hover:border-primary data-[state=off]:hover:text-primary data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary-hover",
      },
    },
    defaultVariants: {
      tone: "primary",
    },
  },
);

export type ChipTone = NonNullable<VariantProps<typeof chipVariants>["tone"]>;
