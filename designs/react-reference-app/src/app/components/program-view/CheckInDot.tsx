import { cn } from '../ui/utils';

type CheckInDotSize = 'sm' | 'md';

const SIZE_CLASS: Record<CheckInDotSize, string> = { sm: 'size-2', md: 'size-2.5' };

export function CheckInDot({ size = 'sm', className }: { size?: CheckInDotSize; className?: string }) {
  return <span aria-hidden="true" className={cn('shrink-0 rounded-full bg-check-in-marker', SIZE_CLASS[size], className)} />;
}
