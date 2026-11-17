import type { BlockType } from '../../domain/program';
import { cn } from '../ui/utils';
import { BLOCK_RULE } from './blockColours';

type BlockNumberSize = 'xs' | 'sm' | 'md';

type BlockNumberProps = { block: { type: BlockType }; index: number; size: BlockNumberSize };

const SIZE_CLASS: Record<BlockNumberSize, string> = {
  xs: 'size-5.5 text-xs leading-none',
  sm: 'size-7 text-xs',
  md: 'size-8 text-sm',
};

export function BlockNumber({ block, index, size }: BlockNumberProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center rounded-tile border-2 bg-surface-base font-semibold text-text-primary tabular-nums', SIZE_CLASS[size], BLOCK_RULE[block.type])}
    >
      {index + 1}
    </span>
  );
}
