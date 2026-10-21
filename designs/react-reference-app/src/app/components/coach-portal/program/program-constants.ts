import type { BlockType, SplitShape, Weekday } from '../../../domain/program';

export const BLOCK_SWATCH: Record<BlockType, string> = {
  foundation: 'bg-training-foundation',
  hypertrophy: 'bg-training-hypertrophy',
  strength: 'bg-training-strength',
  deload: 'bg-training-deload',
};

export const BLOCK_SOFT: Record<BlockType, string> = {
  foundation: 'bg-training-foundation-soft',
  hypertrophy: 'bg-training-hypertrophy-soft',
  strength: 'bg-training-strength-soft',
  deload: 'bg-training-deload-soft',
};

export const SPLIT_SHAPE_LABELS: Record<SplitShape, string> = { 'full-body': 'Full body', 'upper-lower': 'Upper / lower' };

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};
