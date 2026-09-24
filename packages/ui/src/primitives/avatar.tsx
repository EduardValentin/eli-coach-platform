import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

const avatarClasses = cva(
  "flex shrink-0 items-center justify-center rounded-full font-medium",
  {
    variants: {
      size: {
        sm: "size-8 text-sm",
        md: "size-10 text-sm",
        lg: "size-16 text-xl",
      },
      tone: {
        quiet: "bg-surface-neutral text-text-primary",
        muted: "bg-surface-neutral text-text-primary opacity-70",
      },
    },
    defaultVariants: {
      size: "md",
      tone: "quiet",
    },
  },
);

type AvatarProps = VariantProps<typeof avatarClasses> & {
  name: string;
};

export function Avatar({ name, size, tone }: AvatarProps) {
  return (
    <div aria-hidden="true" className={cn(avatarClasses({ size, tone }))}>
      {name.charAt(0)}
    </div>
  );
}
