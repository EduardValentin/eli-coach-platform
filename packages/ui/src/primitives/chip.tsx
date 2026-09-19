import { cva, type VariantProps } from "class-variance-authority";

export const chipVariants = cva(
  "inline-flex min-h-11 items-center rounded-full border bg-surface-base px-4 py-2 text-sm text-text-primary outline-none transition-[background-color,border-color,color] duration-150 ease-out",
  {
    variants: {
      tone: {
        brand:
          "border-control-border-soft data-[state=off]:hover:border-brand-primary data-[state=off]:hover:text-brand-primary data-[state=on]:border-brand-primary data-[state=on]:bg-brand-primary data-[state=on]:text-brand-primary-foreground",
        "brand-secondary":
          "border-control-border-soft data-[state=off]:hover:border-brand-secondary data-[state=off]:hover:text-brand-secondary data-[state=on]:border-brand-secondary data-[state=on]:bg-brand-secondary data-[state=on]:text-brand-secondary-foreground",
        soft: "text-text-muted data-[state=off]:hover:border-brand-primary data-[state=off]:hover:text-brand-primary data-[state=on]:border-brand-primary/30 data-[state=on]:bg-brand-primary-soft data-[state=on]:text-brand-primary data-[state=on]:hover:border-brand-primary",
      },
    },
    defaultVariants: {
      tone: "brand",
    },
  },
);

export type ChipTone = NonNullable<VariantProps<typeof chipVariants>["tone"]>;
