import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Avatar as RadixAvatar } from "radix-ui";

import { cn } from "../lib/cn";

const avatarSizeVariants = cva(
  "relative inline-flex shrink-0 overflow-hidden rounded-pill border border-border-soft bg-surface-brand-soft text-text-primary shadow-soft",
  {
    variants: {
      size: {
        sm: "size-[var(--size-avatar-sm)]",
        md: "size-[var(--size-avatar-md)]",
        lg: "size-[var(--size-avatar-lg)]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const avatarFallbackVariants = cva(
  "flex size-full items-center justify-center rounded-pill bg-brand-primary-soft font-semibold uppercase text-text-primary",
  {
    variants: {
      size: {
        sm: "text-body-sm",
        md: "text-body-base",
        lg: "text-body-lg",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

type AvatarSizeProps = VariantProps<typeof avatarSizeVariants>;

export type AvatarProps = React.ComponentPropsWithoutRef<typeof RadixAvatar.Root> &
  AvatarSizeProps;

export const Avatar = React.forwardRef<
  React.ElementRef<typeof RadixAvatar.Root>,
  AvatarProps
>(({ className, size, ...props }, ref) => (
  <RadixAvatar.Root
    ref={ref}
    className={cn(avatarSizeVariants({ size }), className)}
    {...props}
  />
));

Avatar.displayName = "Avatar";

export type AvatarImageProps = React.ComponentPropsWithoutRef<typeof RadixAvatar.Image>;

export const AvatarImage = React.forwardRef<
  React.ElementRef<typeof RadixAvatar.Image>,
  AvatarImageProps
>(({ className, ...props }, ref) => (
  <RadixAvatar.Image
    ref={ref}
    className={cn("size-full object-cover", className)}
    {...props}
  />
));

AvatarImage.displayName = "AvatarImage";

export type AvatarFallbackProps = React.ComponentPropsWithoutRef<typeof RadixAvatar.Fallback> &
  AvatarSizeProps;

export const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof RadixAvatar.Fallback>,
  AvatarFallbackProps
>(({ className, size, ...props }, ref) => (
  <RadixAvatar.Fallback
    ref={ref}
    className={cn(avatarFallbackVariants({ size }), className)}
    {...props}
  />
));

AvatarFallback.displayName = "AvatarFallback";
