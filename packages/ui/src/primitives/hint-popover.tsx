import {
  useId,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type HintSide = "top" | "bottom";

type HintAlign = "start" | "center" | "end";

type HintPopoverProps = {
  align?: HintAlign;
  children: ReactElement;
  contentParity?: string;
  contentParityRoot?: string;
  hint: ReactNode;
  side?: HintSide;
};

export function HintPopover({
  align = "start",
  children,
  contentParity,
  contentParityRoot,
  hint,
  side = "bottom",
}: HintPopoverProps) {
  const { hintId, open, setOpen, triggerProps } = useHintTrigger();

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild {...triggerProps}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        aria-labelledby={hintId}
        className="w-fit max-w-sm rounded-field border-0 bg-primary px-3 py-1.5 text-xs text-pretty text-primary-foreground shadow-none"
        collisionPadding={16}
        data-parity={contentParity}
        data-parity-root={contentParityRoot}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
        side={side}
      >
        <div className="space-y-1" id={hintId}>
          {hint}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function useHintTrigger() {
  const [open, setOpen] = useState(false);
  const tapClosesHint = useRef(false);
  const hintId = useId();

  return {
    hintId,
    open,
    setOpen,
    triggerProps: {
      "aria-describedby": open ? hintId : undefined,
      onBlur: () => setOpen(false),
      onClick: (event: MouseEvent) => {
        event.preventDefault();
        setOpen(!tapClosesHint.current);
        tapClosesHint.current = false;
      },
      onFocus: (event: FocusEvent) => {
        if (event.currentTarget.matches(":focus-visible")) {
          setOpen(true);
        }
      },
      onPointerDown: (event: PointerEvent) => {
        tapClosesHint.current = event.pointerType !== "mouse" && open;
      },
      onPointerEnter: (event: PointerEvent) => {
        if (event.pointerType === "mouse") {
          setOpen(true);
        }
      },
      onPointerLeave: (event: PointerEvent) => {
        if (event.pointerType === "mouse") {
          setOpen(false);
        }
      },
    },
  };
}
