import { useId, useState } from 'react';
import type { Block } from '../../../domain/program';
import type { BlockStatus } from '../../../domain/programCalendar';
import { blockingMessage, blockShorterThanElapsed, type BlockingCode, type RuleFinding } from '../../../domain/programRules';
import { describedBy } from '../../../utils/describedBy';
import { CAPTION_CLASS } from '../../typography';
import { InlineProblem } from '../../ui/inline-problem';
import { Input } from '../../ui/input';
import { cn } from '../../ui/utils';

type WeeksFieldInput = {
  blocks: Block[];
  index: number;
  status: BlockStatus;
  dayOne: Date | null;
  today: Date;
  onCommit: (weeks: number) => void;
};

export type WeeksFieldState = ReturnType<typeof useWeeksField>;

const DELOAD_WEEKS_HINT = 'A deload is always 1 week';

function weeksLocked(block: Block, status: BlockStatus): boolean {
  return block.type === 'deload' || status.kind === 'ended';
}

function elapsedRefusal(status: BlockStatus, weeks: number): RuleFinding<BlockingCode> | undefined {
  if (status.kind !== 'current' || weeks >= status.weekOfBlock) return undefined;
  return { code: 'block-shorter-than-elapsed', detail: String(status.weekOfBlock - 1) };
}

export function useWeeksField({ blocks, index, status, dayOne, today, onCommit }: WeeksFieldInput) {
  const block = blocks[index];
  const [text, setText] = useState(String(block.weeks));
  const [problem, setProblem] = useState<string | null>(null);
  const [shownWeeks, setShownWeeks] = useState(block.weeks);
  const problemId = useId();
  const hintId = useId();
  const hint = block.type === 'deload' ? DELOAD_WEEKS_HINT : null;
  if (shownWeeks !== block.weeks) {
    setShownWeeks(block.weeks);
    setText(String(block.weeks));
  }

  function change(raw: string) {
    setProblem(null);
    const weeks = Number(raw);
    if (raw === '' || !Number.isInteger(weeks) || weeks < 1) {
      setText(raw);
      return;
    }
    const withWeeks = blocks.map((other, at) => (at === index ? { ...block, weeks } : other));
    const refusal = elapsedRefusal(status, weeks) ?? blockShorterThanElapsed({ draftBlocks: withWeeks, publishedBlocks: blocks, dayOne, today })[0];
    if (refusal) {
      setText(String(block.weeks));
      setProblem(blockingMessage(refusal));
      return;
    }
    setText(raw);
    onCommit(weeks);
  }

  return {
    weeks: block.weeks,
    hint: hint ? { id: hintId, text: hint } : null,
    problem: problem ? { id: problemId, text: problem } : null,
    inputProps: {
      type: 'number',
      min: 1,
      value: text,
      disabled: weeksLocked(block, status),
      'aria-invalid': problem ? true : undefined,
      'aria-describedby': describedBy([problem && problemId, hint && hintId]),
      onChange: (event: { target: { value: string } }) => change(event.target.value),
      onBlur: () => setText(String(block.weeks)),
    },
  };
}

type WeeksFieldName = { label: string } | { labelledBy: string };

/** The block's length: a number field followed by "week" or "weeks". Its hint and problem are `WeeksFieldNotes`, placed by the caller. */
export function WeeksField({ field, name }: { field: WeeksFieldState; name: WeeksFieldName }) {
  const naming = 'label' in name ? { 'aria-label': name.label } : { 'aria-labelledby': name.labelledBy };
  return (
    <span className="flex items-center gap-1.5 text-sm text-text-secondary">
      <Input className="w-16 tabular-nums" {...naming} {...field.inputProps} />
      {field.weeks === 1 ? 'week' : 'weeks'}
    </span>
  );
}

export function WeeksFieldNotes({ field, className }: { field: WeeksFieldState; className?: string }) {
  if (!field.hint && !field.problem) return null;
  return (
    <div className={cn('grid gap-1.5', className)}>
      {field.hint && (
        <p id={field.hint.id} className={CAPTION_CLASS}>
          {field.hint.text}
        </p>
      )}
      {field.problem && <InlineProblem id={field.problem.id}>{field.problem.text}</InlineProblem>}
    </div>
  );
}
