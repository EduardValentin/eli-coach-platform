import { useId, useRef, useState, type ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from './ui/utils';

type IconHintTone = 'neutral' | 'danger';

const TONE_CLASS: Record<IconHintTone, string> = {
  neutral: '',
  danger: 'text-destructive',
};

interface IconHintProps {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  tone?: IconHintTone;
  className?: string;
  parity?: string;
  contentParityRoot?: string;
}

export function IconHint({
  label,
  icon,
  children,
  tone = 'neutral',
  className,
  parity,
  contentParityRoot,
}: IconHintProps) {
  const [open, setOpen] = useState(false);
  const tapClosesHint = useRef(false);
  const hintId = useId();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-describedby={open ? hintId : undefined}
          data-parity={parity}
          onPointerDown={(event) => {
            tapClosesHint.current = event.pointerType !== 'mouse' && open;
          }}
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') setOpen(true);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setOpen(false);
          }}
          onFocus={(event) => {
            if (event.currentTarget.matches(':focus-visible')) setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          onClick={(event) => {
            event.preventDefault();
            setOpen(!tapClosesHint.current);
            tapClosesHint.current = false;
          }}
          className={cn(
            'inline-flex size-6 items-center justify-center rounded-full',
            TONE_CLASS[tone],
            className,
          )}
        >
          {icon}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        collisionPadding={16}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        data-parity-root={contentParityRoot}
        className="w-fit max-w-sm rounded-field border-0 bg-primary px-3 py-1.5 text-xs text-pretty text-primary-foreground shadow-none"
      >
        <div id={hintId} className="space-y-1">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}
