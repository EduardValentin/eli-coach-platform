import type { ComponentProps } from 'react';
import type { BlockType } from '../../../domain/program';
import type { Badge } from '../../ui/badge';

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

export const BLOCK_BADGE_TONE: Record<BlockType, NonNullable<ComponentProps<typeof Badge>['tone']>> = {
  foundation: 'tint-cyan',
  hypertrophy: 'tint-violet',
  strength: 'brand-secondary',
  deload: 'tint-slate',
};
