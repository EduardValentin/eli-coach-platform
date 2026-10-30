import { cva } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";

export type IconChoice<Key extends string> = {
  key: Key;
  label: string;
  icon: LucideIcon;
};

export const iconChoiceClasses = cva("rounded-compact transition-colors", {
  variants: {
    state: {
      chosen: "bg-primary-soft text-primary",
      resting: "text-text-secondary hover:bg-surface-muted",
    },
  },
  defaultVariants: {
    state: "resting",
  },
});
