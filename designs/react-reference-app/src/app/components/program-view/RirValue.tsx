import type { CSSProperties } from 'react';
import { formatRange, type Range } from '../../domain/program';
import { cn } from '../ui/utils';

const MIDDLE_RIR = 2;
const FAR_RIR = 4;
const SOLID_UP_TO_RIR = 1;

function mix(from: string, to: string, share: number): string {
  return `color-mix(in oklch, ${to} ${Math.round(share * 100)}%, ${from})`;
}

function rirColour(rir: Range): string {
  const closest = Math.min(Math.max(rir.min, 0), FAR_RIR);
  if (closest <= MIDDLE_RIR) return mix('var(--rir-failure)', 'var(--rir-near)', closest / MIDDLE_RIR);
  return mix('var(--rir-near)', 'var(--rir-far)', (closest - MIDDLE_RIR) / (FAR_RIR - MIDDLE_RIR));
}

function rirStyle(rir: Range): CSSProperties {
  const ink = mix(rirColour(rir), 'var(--rir-ink)', 0.3);
  if (rir.min <= SOLID_UP_TO_RIR) return { color: 'var(--surface-base)', backgroundColor: ink };
  return { color: ink, backgroundColor: mix('transparent', rirColour(rir), 0.12) };
}

export function RirValue({ rir, className }: { rir: Range; className?: string }) {
  return (
    <span style={rirStyle(rir)} className={cn('inline-flex rounded-full px-1.5 font-semibold whitespace-nowrap tabular-nums', className)}>
      {formatRange(rir)}
    </span>
  );
}
