import type { ReactNode } from 'react';
import { cn } from './ui/utils';

export function TablePanel({
  className,
  parity,
  children,
}: {
  className?: string;
  parity?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50 overflow-hidden motion-safe:animate-panel-enter',
        className,
      )}
      data-parity={parity}
    >
      {children}
    </div>
  );
}
