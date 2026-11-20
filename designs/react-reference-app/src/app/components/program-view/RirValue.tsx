import { formatRange, type Range } from '../../domain/program';
import { EffortPill, type EffortTone } from './EffortPill';

const HIGH_EFFORT_UP_TO_RIR = 1;
const MID_EFFORT_RIR = 2;

/** A span of sets takes the tone of its hardest set. */
function effortOf(lowest: number): EffortTone {
  if (lowest <= HIGH_EFFORT_UP_TO_RIR) return 'high';
  return lowest === MID_EFFORT_RIR ? 'mid' : 'low';
}

function spanOf(rir: number | Range): Range {
  return typeof rir === 'number' ? { min: rir, max: rir } : rir;
}

type RirValueProps = { rir: number | Range; size?: 'inline' | 'numeral'; className?: string };

export function RirValue({ rir, size = 'inline', className }: RirValueProps) {
  const span = spanOf(rir);
  return (
    <EffortPill tone={effortOf(span.min)} size={size} className={className}>
      {formatRange(span)}
    </EffortPill>
  );
}
