import { formatRange, type Range } from '../../domain/program';
import { EffortPill, type EffortTone } from './EffortPill';

const HIGH_EFFORT_UP_TO_RIR = 1;
const MID_EFFORT_RIR = 2;

function effortOf(rir: Range): EffortTone {
  if (rir.min <= HIGH_EFFORT_UP_TO_RIR) return 'high';
  return rir.min === MID_EFFORT_RIR ? 'mid' : 'low';
}

type RirValueProps = { rir: Range; size?: 'inline' | 'numeral'; className?: string };

export function RirValue({ rir, size = 'inline', className }: RirValueProps) {
  return (
    <EffortPill tone={effortOf(rir)} size={size} className={className}>
      {formatRange(rir)}
    </EffortPill>
  );
}
