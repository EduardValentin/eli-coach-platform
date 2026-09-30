import { useId, useRef, useState, type ReactNode } from "react";

import { cn } from "../lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

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
  const [open, setOpen] = useState(false);
  const tapClosesHint = useRef(false);
  const hintId = useId();

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-describedby={open ? hintId : undefined}
          aria-label={label}
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-full",
            TONE_CLASS[tone],
            className,
          )}
          data-parity={parity}
          onBlur={() => setOpen(false)}
          onClick={(event) => {
            event.preventDefault();
            setOpen(!tapClosesHint.current);
            tapClosesHint.current = false;
          }}
          onFocus={(event) => {
            if (event.currentTarget.matches(":focus-visible")) {
              setOpen(true);
            }
          }}
          onPointerDown={(event) => {
            tapClosesHint.current = event.pointerType !== "mouse" && open;
          }}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") {
              setOpen(true);
            }
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") {
              setOpen(false);
            }
          }}
          type="button"
        >
          {icon}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-fit max-w-sm rounded-field border-0 bg-primary px-3 py-1.5 text-xs text-pretty text-primary-foreground shadow-none"
        collisionPadding={16}
        data-parity-root={contentParityRoot}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
        side="bottom"
      >
        <div className="space-y-1" id={hintId}>
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}
