import { cn } from './ui/utils';

export function AttentionDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block size-2 shrink-0 rounded-full bg-status-pending', className)}
      data-parity="attention-dot"
    />
  );
}
