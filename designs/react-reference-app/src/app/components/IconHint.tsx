import type { ReactNode } from 'react';
import { HintPopover } from './HintPopover';
import { cn } from './ui/utils';

type IconHintSize = 'default' | 'compact';

type IconHintTone = 'neutral' | 'muted' | 'danger';

const SIZE_CLASS: Record<IconHintSize, string> = {
  default: 'size-6 rounded-full',
  compact: 'size-5 rounded-control',
};

const TONE_CLASS: Record<IconHintTone, string> = {
  neutral: '',
  muted: 'text-text-secondary hover:text-text-primary',
  danger: 'text-destructive',
};

interface IconHintProps {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  size?: IconHintSize;
  tone?: IconHintTone;
  className?: string;
  parity?: string;
  contentParityRoot?: string;
}

export function IconHint({
  label,
  icon,
  children,
  size = 'default',
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
          'inline-flex items-center justify-center',
          SIZE_CLASS[size],
          TONE_CLASS[tone],
          className,
        )}
      >
        {icon}
      </button>
    </HintPopover>
  );
}
