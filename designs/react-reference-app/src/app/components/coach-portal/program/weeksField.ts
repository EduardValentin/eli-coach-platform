import { useId, useState } from 'react';
import type { Block } from '../../../domain/program';
import type { BlockStatus } from '../../../domain/programCalendar';
import { blockingMessage, blockShorterThanElapsed, type BlockingCode, type RuleFinding } from '../../../domain/programRules';

type WeeksFieldInput = {
  blocks: Block[];
  index: number;
  status: BlockStatus;
  dayOne: Date | null;
  today: Date;
  onCommit: (weeks: number) => void;
};

export function weeksLocked(block: Block, status: BlockStatus): boolean {
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
    problem,
    problemId,
    inputProps: {
      type: 'number',
      min: 1,
      value: text,
      disabled: weeksLocked(block, status),
      'aria-invalid': problem ? true : undefined,
      'aria-describedby': problem ? problemId : undefined,
      onChange: (event: { target: { value: string } }) => change(event.target.value),
      onBlur: () => setText(String(block.weeks)),
    },
  };
}
