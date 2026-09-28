import { cva, type VariantProps } from "class-variance-authority";

export const FIELD_FRAME_CLASS =
  "w-full rounded-field border border-control-border-soft bg-surface-base transition-[color,box-shadow] outline-none aria-invalid:border-feedback-danger disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

export const fieldSizeClasses = cva("", {
  variants: {
    size: {
      sm: "h-(--size-control-sm) px-2.5 text-base md:text-sm",
      md: "h-(--size-control-md) px-3 text-base md:text-sm",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export type FieldSize = NonNullable<
  VariantProps<typeof fieldSizeClasses>["size"]
>;
