import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import { HintPopover } from "./hint-popover";

type IconHintTone = "neutral" | "danger";

const TONE_CLASS: Record<IconHintTone, string> = {
  neutral: "",
  danger: "text-feedback-danger",
};

type IconHintProps = {
  children: ReactNode;
  className?: string;
  contentParityRoot?: string;
  icon: ReactNode;
  label: string;
  parity?: string;
  tone?: IconHintTone;
};

export function IconHint({
  children,
  className,
  contentParityRoot,
  icon,
  label,
  parity,
  tone = "neutral",
}: IconHintProps) {
  return (
    <HintPopover contentParityRoot={contentParityRoot} hint={children}>
      <button
        aria-label={label}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full",
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
