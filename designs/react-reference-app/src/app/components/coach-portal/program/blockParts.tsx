import { BLOCK_TYPE_LABELS, BLOCK_TYPES, type Block, type BlockType } from '../../../domain/program';
import type { BlockStatus } from '../../../domain/programCalendar';
import { formatJourneyDate } from '../../../utils/journeyLabels';
import { BLOCK_SWATCH } from '../../program-view/blockColours';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { cn } from '../../ui/utils';

export const STARTED_BLOCK_REASON = 'A block that has started stays in the plan.';

export function endedText(status: Extract<BlockStatus, { kind: 'ended' }>): string {
  return `ended ${formatJourneyDate(status.end)}`;
}

export function currentWeekText(block: Block, status: Extract<BlockStatus, { kind: 'current' }>): string {
  return `week ${status.weekOfBlock} of ${block.weeks}`;
}

export function blockProgress(block: Block, status: BlockStatus): string | null {
  if (status.kind === 'ended') return endedText(status);
  if (status.kind === 'current') return currentWeekText(block, status);
  return null;
}

export function filledSessionsText(filled: number, total: number): string {
  return `${filled} of ${total} sessions`;
}

type BlockNumberProps = { block: Block; index: number; size: 'sm' | 'md' };

export function BlockNumber({ block, index, size }: BlockNumberProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-tile font-semibold text-primary-foreground tabular-nums',
        BLOCK_SWATCH[block.type],
        { 'size-7 text-xs': size === 'sm', 'size-8 text-sm': size === 'md' },
      )}
    >
      {index + 1}
    </span>
  );
}

type BlockTypeSelectProps = { value: BlockType; label: string; appearance: 'title' | 'field'; onChange: (type: BlockType) => void };

export function BlockTypeSelect({ value, label, appearance, onChange }: BlockTypeSelectProps) {
  return (
    <Select value={value} onValueChange={next => onChange(next as BlockType)}>
      <SelectTrigger
        size={appearance === 'field' ? 'sm' : undefined}
        aria-label={label}
        className={cn({
          'w-auto border-transparent bg-transparent px-2 text-lg font-semibold text-text-primary shadow-none hover:bg-surface-quiet md:text-lg': appearance === 'title',
          'w-40': appearance === 'field',
        })}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {BLOCK_TYPES.map(type => (
          <SelectItem key={type} value={type}>
            {BLOCK_TYPE_LABELS[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
