import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

const AVATAR_CLASSES =
  "size-11 shrink-0 rounded-full border border-control-border-soft";

const initialClasses = cva(
  "flex items-center justify-center font-heading text-sm font-semibold",
  {
    variants: {
      tone: {
        quiet: "bg-surface-muted text-text-primary",
        muted: "bg-surface-neutral text-text-muted",
      },
    },
    defaultVariants: {
      tone: "quiet",
    },
  },
);

type AvatarProps = VariantProps<typeof initialClasses> & {
  imageUrl?: string;
  name: string;
};

export function Avatar({ imageUrl, name, tone }: AvatarProps) {
  if (imageUrl) {
    return (
      <img
        alt=""
        className={cn(AVATAR_CLASSES, "object-cover")}
        src={imageUrl}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(AVATAR_CLASSES, initialClasses({ tone }))}
    >
      {name.charAt(0)}
    </div>
  );
}
