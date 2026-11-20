import { BLOCK_TYPE_LABELS, BLOCK_TYPES, type Block, type BlockType } from '../../../domain/program';
import type { BlockStatus } from '../../../domain/programCalendar';
import { formatJourneyDate } from '../../../utils/journeyLabels';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { cn } from '../../ui/utils';

export const STARTED_BLOCK_REASON = 'A block that has started stays in the plan.';

export function endedText(status: Extract<BlockStatus, { kind: 'ended' }>): string {
  return `ended ${formatJourneyDate(status.end)}`;
}

export function currentWeekText(block: Block, status: Extract<BlockStatus, { kind: 'current' }>): string {
  return block.weeks === 1 ? 'this week' : `week ${status.weekOfBlock} of ${block.weeks}`;
}

export function blockProgress(block: Block, status: BlockStatus): string | null {
  if (status.kind === 'ended') return endedText(status);
  if (status.kind === 'current') return currentWeekText(block, status);
  return null;
}

export function filledSessionsText(filled: number, total: number): string {
  return `${filled} of ${total} sessions`;
}

type BlockTypeSelectProps = { value: BlockType; label: string; appearance: 'title' | 'field'; problemId?: string; onChange: (type: BlockType) => void };

export function BlockTypeSelect({ value, label, appearance, problemId, onChange }: BlockTypeSelectProps) {
  return (
    <Select value={value} onValueChange={next => onChange(next as BlockType)}>
      <SelectTrigger
        aria-label={label}
        aria-describedby={problemId}
        aria-invalid={problemId ? true : undefined}
        className={cn({
          'w-auto min-w-0 bg-transparent px-2 text-left text-lg font-semibold whitespace-normal text-text-primary shadow-none hover:bg-surface-quiet md:text-lg *:data-[slot=select-value]:line-clamp-2': appearance === 'title',
          'w-full min-w-0 @3xl:w-auto @3xl:min-w-40': appearance === 'field',
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
