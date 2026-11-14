import type { BlockType } from '../../domain/program';

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

export const BLOCK_RULE: Record<BlockType, string> = {
  foundation: 'border-training-foundation',
  hypertrophy: 'border-training-hypertrophy',
  strength: 'border-training-strength',
  deload: 'border-training-deload',
};
