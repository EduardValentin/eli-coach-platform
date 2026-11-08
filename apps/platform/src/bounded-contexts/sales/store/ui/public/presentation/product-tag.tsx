import { cn } from "~/shared/design-system/lib";
import type { ComponentPropsWithoutRef } from "react";

const PRODUCT_TAG_SIZES = {
  sm: "px-2 py-1",
  md: "px-3 py-1.5",
} as const;

const PRODUCT_TAG_TONES = {
  paid: "bg-surface-base bg-linear-to-r from-brand-primary-soft to-brand-primary-soft text-brand-primary",
  free: "bg-surface-base bg-linear-to-r from-brand-secondary-soft to-brand-secondary-soft text-brand-secondary",
  goal: "bg-surface-subtle text-copy-muted",
} as const;

type ProductTagTone = keyof typeof PRODUCT_TAG_TONES;

type ProductTagProps = ComponentPropsWithoutRef<"span"> & {
  size: keyof typeof PRODUCT_TAG_SIZES;
  tone: ProductTagTone;
};

export function ProductTag({
  className,
  size,
  tone,
  ...props
}: ProductTagProps) {
  return (
    <span
      className={cn(
        "rounded-tile text-label uppercase",
        PRODUCT_TAG_SIZES[size],
        PRODUCT_TAG_TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
