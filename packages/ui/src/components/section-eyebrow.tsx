import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

export const sectionEyebrowVariants = cva(
  "block font-body uppercase tracking-section-eyebrow",
  {
    variants: {
      variant: {
        brand: "mb-4 text-xs font-semibold text-brand-primary md:text-sm",
        muted: "mb-6 text-body-sm font-regular text-text-muted",
      },
    },
    defaultVariants: {
      variant: "brand",
    },
  },
);

export type SectionEyebrowProps = React.ComponentPropsWithoutRef<"p"> &
  VariantProps<typeof sectionEyebrowVariants>;

function getSectionEyebrowClassName({
  className,
  variant,
}: Pick<SectionEyebrowProps, "className" | "variant">) {
  const variantClassName = sectionEyebrowVariants({ variant });

  return className ? `${variantClassName} ${className}` : variantClassName;
}

export const SectionEyebrow = React.forwardRef<
  HTMLParagraphElement,
  SectionEyebrowProps
>(({ className, variant, ...props }, ref) => (
  <p
    ref={ref}
    className={getSectionEyebrowClassName({
      className,
      variant,
    })}
    {...props}
  />
));

SectionEyebrow.displayName = "SectionEyebrow";
