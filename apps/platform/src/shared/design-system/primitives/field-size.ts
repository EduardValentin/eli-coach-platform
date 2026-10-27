import { cva, type VariantProps } from "class-variance-authority";

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
