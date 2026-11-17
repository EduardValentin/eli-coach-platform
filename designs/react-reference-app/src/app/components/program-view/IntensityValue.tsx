import type { CardioIntensity } from '../../domain/program';
import { CARDIO_INTENSITY_LABELS } from '../../domain/programCardio';
import { EffortPill, type EffortTone } from './EffortPill';

const EFFORT_OF: Record<CardioIntensity, EffortTone> = { easy: 'low', moderate: 'mid', hard: 'high' };

type IntensitySize = 'viewer' | 'document';

const PILL_SIZE: Record<IntensitySize, 'word' | 'document'> = { viewer: 'word', document: 'document' };

export function IntensityValue({ intensity, size = 'viewer' }: { intensity: CardioIntensity; size?: IntensitySize }) {
  return (
    <EffortPill tone={EFFORT_OF[intensity]} size={PILL_SIZE[size]}>
      {CARDIO_INTENSITY_LABELS[intensity]}
    </EffortPill>
  );
}
