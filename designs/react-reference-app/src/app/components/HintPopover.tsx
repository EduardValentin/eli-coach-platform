import {
  useId,
  useRef,
  useState,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface HintPopoverProps {
  hint: ReactNode;
  children: ReactElement;
  side?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
  contentParity?: string;
  contentParityRoot?: string;
}

function useHintTrigger() {
  const [open, setOpen] = useState(false);
  const tapClosesHint = useRef(false);
  const hintId = useId();

  return {
    open,
    setOpen,
    hintId,
    triggerProps: {
      'aria-describedby': open ? hintId : undefined,
      onPointerDown: (event: PointerEvent) => {
        tapClosesHint.current = event.pointerType !== 'mouse' && open;
      },
      onPointerEnter: (event: PointerEvent) => {
        if (event.pointerType === 'mouse') setOpen(true);
      },
      onPointerLeave: (event: PointerEvent) => {
        if (event.pointerType === 'mouse') setOpen(false);
      },
      onFocus: (event: { currentTarget: Element }) => {
        if (event.currentTarget.matches(':focus-visible')) setOpen(true);
      },
      onBlur: () => setOpen(false),
      onClick: (event: { preventDefault: () => void }) => {
        event.preventDefault();
        setOpen(!tapClosesHint.current);
        tapClosesHint.current = false;
      },
    },
  };
}

export function HintPopover({
  hint,
  children,
  side = 'bottom',
  align = 'start',
  contentParity,
  contentParityRoot,
}: HintPopoverProps) {
  const { open, setOpen, hintId, triggerProps } = useHintTrigger();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild {...triggerProps}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        collisionPadding={16}
        aria-labelledby={hintId}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        data-parity={contentParity}
        data-parity-root={contentParityRoot}
        className="w-fit max-w-sm rounded-field border-0 bg-primary px-3 py-1.5 text-xs text-pretty text-primary-foreground shadow-none"
      >
        <div id={hintId} className="space-y-1">
          {hint}
        </div>
      </PopoverContent>
    </Popover>
  );
}
