import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import { HintPopover } from "./hint-popover";

type IconHintSize = "default" | "compact";

type IconHintTone = "neutral" | "muted" | "danger";

const SIZE_CLASS: Record<IconHintSize, string> = {
  default: "size-6 rounded-full",
  compact: "size-5 rounded-control",
};

const TONE_CLASS: Record<IconHintTone, string> = {
  neutral: "",
  muted: "text-text-secondary hover:text-text-primary",
  danger: "text-feedback-danger",
};

type IconHintProps = {
  children: ReactNode;
  className?: string;
  contentParityRoot?: string;
  icon: ReactNode;
  label: string;
  parity?: string;
  size?: IconHintSize;
  tone?: IconHintTone;
};

export function IconHint({
  children,
  className,
  contentParityRoot,
  icon,
  label,
  parity,
  size = "default",
  tone = "neutral",
}: IconHintProps) {
  return (
    <HintPopover contentParityRoot={contentParityRoot} hint={children}>
      <button
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center",
          SIZE_CLASS[size],
          TONE_CLASS[tone],
          className,
        )}
        data-parity={parity}
        type="button"
      >
        {icon}
      </button>
    </HintPopover>
  );
}
