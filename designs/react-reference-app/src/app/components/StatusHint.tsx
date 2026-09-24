import { useState, type ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from './ui/utils';

interface StatusHintProps {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}

export function StatusHint({
  label,
  icon,
  children,
  className,
}: StatusHintProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
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
          className={cn(
            'inline-flex size-6 items-center justify-center rounded-full',
            className,
          )}
        >
          {icon}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="w-fit max-w-xs space-y-1 rounded-field border-0 bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-none"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
