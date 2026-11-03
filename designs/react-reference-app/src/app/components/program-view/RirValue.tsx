import type { CSSProperties } from 'react';
import { formatRange, type Range } from '../../domain/program';
import { cn } from '../ui/utils';

const MIDDLE_RIR = 2;
const FAR_RIR = 4;

function mix(from: string, to: string, share: number): string {
  return `color-mix(in oklch, ${to} ${Math.round(share * 100)}%, ${from})`;
}

function rirColour(rir: Range): string {
  const closest = Math.min(Math.max(rir.min, 0), FAR_RIR);
  if (closest <= MIDDLE_RIR) return mix('var(--rir-failure)', 'var(--rir-near)', closest / MIDDLE_RIR);
  return mix('var(--rir-near)', 'var(--rir-far)', (closest - MIDDLE_RIR) / (FAR_RIR - MIDDLE_RIR));
}

export function RirValue({ rir, className }: { rir: Range; className?: string }) {
  const colour = rirColour(rir);
  const style: CSSProperties = { color: colour, backgroundColor: `color-mix(in oklch, ${colour} 12%, transparent)` };
  return (
    <span style={style} className={cn('inline-flex rounded-full px-1.5 font-semibold tabular-nums', className)}>
      {formatRange(rir)}
    </span>
  );
}
