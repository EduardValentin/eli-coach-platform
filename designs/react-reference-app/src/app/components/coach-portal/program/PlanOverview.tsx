import type { BuilderWeekDates } from '../../../services/builderWeekDates';
import type { ReactNode } from 'react';
import type { Exercise } from '../../../context/TrainingContext';
import { BLOCK_TYPE_LABELS, type LevelHint, type ProgramContent, type Weekday } from '../../../domain/program';
import { blockStatus } from '../../../domain/programCalendar';
import { blockingMessage, sequenceProblems, type BlockingCode, type RuleFinding } from '../../../domain/programRules';
import { suggestedBlocks } from '../../../domain/programSuggestions';
import { counted } from '../../../utils/counted';
import { Button } from '../../ui/button';
import { PlanBlockList, type BlocksUpdate } from './PlanBlockList';
import { PlanTimeline } from '../../program-view/PlanTimeline';

type PlanOverviewProps = {
  content: ProgramContent;
  dayOne: Date | null;
  preferredWeekday: Weekday;
  today: Date;
  level: LevelHint;
  library: readonly Exercise[];
  onChange: (update: BlocksUpdate) => void;
  onOpenBlock: (blockId: string) => void;
  onAddBlock: () => void;
  onUseSuggestion: () => void;
  settings: ReactNode;
  weekDates: BuilderWeekDates;
};

const LEVEL_LABELS: Record<LevelHint, string> = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
};

function SuggestionBanner({ level, onUse }: { level: LevelHint; onUse: () => void }) {
  const plan = suggestedBlocks(level)
    .map(block => `${BLOCK_TYPE_LABELS[block.type]} ${counted(block.weeks, 'week')}`)
    .join(' → ');
  return (
    <div data-parity="suggestion-banner" className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface-base p-4">
      <p className="text-sm text-text-primary">{`Suggested for a ${LEVEL_LABELS[level]} client: ${plan}`}</p>
      <Button size="sm" onClick={onUse}>
        Use suggestion
      </Button>
    </div>
  );
}

function problemsByBlock(problems: readonly RuleFinding<BlockingCode>[]): Map<string, string[]> {
  const byBlock = new Map<string, string[]>();
  for (const { blockId, ...problem } of problems) {
    if (blockId) byBlock.set(blockId, [...(byBlock.get(blockId) ?? []), blockingMessage(problem)]);
  }
  return byBlock;
}

export function PlanOverview({ content, dayOne, preferredWeekday, today, level, library, onChange, onOpenBlock, onAddBlock, onUseSuggestion, settings, weekDates }: PlanOverviewProps) {
  const { blocks } = content.plan;

  return (
    <section data-parity-root="PlanOverview" className="grid grid-cols-1 gap-6">
      <div data-parity="plan-overview-settings" className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <h2 className="sr-only">Plan overview</h2>
        {settings}
      </div>
      {blocks.length === 0 ? (
        <SuggestionBanner level={level} onUse={onUseSuggestion} />
      ) : (
        <>
          <PlanTimeline
            blocks={blocks}
            dayOne={dayOne}
            preferredWeekday={preferredWeekday}
            today={today}
            weekAction={{ kind: 'open-block', onOpen: blockIndex => onOpenBlock(blocks[blockIndex].id), dates: weekDates }}
          />
          <PlanBlockList
            blocks={blocks}
            statuses={blocks.map((_, index) => blockStatus({ blocks, dayOne, today }, index))}
            dayOne={dayOne}
            today={today}
            problems={problemsByBlock(sequenceProblems(blocks))}
            deload={{ level, library }}
            onChange={onChange}
            onOpenBlock={onOpenBlock}
            onAddBlock={onAddBlock}
          />
        </>
      )}
    </section>
  );
}
