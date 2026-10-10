import type { ReactNode } from 'react';
import { HintPopover } from './HintPopover';
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
  return (
    <HintPopover hint={children} contentParityRoot={contentParityRoot}>
      <button
        type="button"
        aria-label={label}
        data-parity={parity}
        className={cn(
          'inline-flex size-6 items-center justify-center rounded-full',
          TONE_CLASS[tone],
          className,
        )}
      >
        {icon}
      </button>
    </HintPopover>
  );
}
