import { useId, useRef, useState, type ReactNode } from "react";

import { cn } from "../lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type IconHintProps = {
  children: ReactNode;
  className?: string;
  contentParityRoot?: string;
  icon: ReactNode;
  label: string;
  parity?: string;
};

export function IconHint({
  children,
  className,
  contentParityRoot,
  icon,
  label,
  parity,
}: IconHintProps) {
  const [open, setOpen] = useState(false);
  const openWhenTapped = useRef<boolean | null>(null);
  const hintId = useId();

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-describedby={open ? hintId : undefined}
          aria-label={label}
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-full",
            className,
          )}
          data-parity={parity}
          onBlur={() => setOpen(false)}
          onClick={(event) => {
            event.preventDefault();
            const tappedWhileOpen = openWhenTapped.current;
            openWhenTapped.current = null;
            setOpen(tappedWhileOpen === null ? true : !tappedWhileOpen);
          }}
          onFocus={(event) => {
            if (event.currentTarget.matches(":focus-visible")) {
              setOpen(true);
            }
          }}
          onPointerDown={(event) => {
            openWhenTapped.current =
              event.pointerType === "mouse" ? null : open;
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
