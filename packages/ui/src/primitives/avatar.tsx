import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

const avatarClasses = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        sm: "size-8 [&_[data-slot=avatar-fallback]]:text-sm",
        md: "size-10 [&_[data-slot=avatar-fallback]]:text-sm",
        lg: "size-16 [&_[data-slot=avatar-fallback]]:text-xl",
      },
      tone: {
        quiet: "",
        muted: "opacity-70",
        heading:
          "[&_[data-slot=avatar-fallback]]:bg-surface-quiet [&_[data-slot=avatar-fallback]]:font-heading [&_[data-slot=avatar-fallback]]:font-semibold",
      },
    },
    defaultVariants: {
      size: "md",
      tone: "quiet",
    },
  },
);

type AvatarProps = VariantProps<typeof avatarClasses> & {
  imageUrl?: string;
  name: string;
};

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function Avatar({ imageUrl, name, size, tone }: AvatarProps) {
  return (
    <span className={cn(avatarClasses({ size, tone }))}>
      {imageUrl ? (
        <img
          alt=""
          className="aspect-square size-full"
          data-slot="avatar-image"
          src={imageUrl}
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-full shrink-0 items-center justify-center rounded-full bg-surface-neutral font-medium text-text-primary"
          data-slot="avatar-fallback"
        >
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
}
