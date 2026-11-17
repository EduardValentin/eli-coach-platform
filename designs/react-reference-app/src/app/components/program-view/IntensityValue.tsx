import type { CardioIntensity } from '../../domain/program';
import { CARDIO_INTENSITY_LABELS } from '../../domain/programCardio';
import { EffortPill, type EffortTone } from './EffortPill';

const EFFORT_OF: Record<CardioIntensity, EffortTone> = { easy: 'low', moderate: 'mid', hard: 'high' };

export function IntensityValue({ intensity }: { intensity: CardioIntensity }) {
  return (
    <EffortPill tone={EFFORT_OF[intensity]} size="word">
      {CARDIO_INTENSITY_LABELS[intensity]}
    </EffortPill>
  );
}
