import { BLOCK_TYPE_LABELS, type LevelHint, type ProgramContent, type Weekday } from '../../../domain/program';
import { blockStatus } from '../../../domain/programCalendar';
import { blockingMessage, sequenceProblems } from '../../../domain/programRules';
import { suggestedBlocks } from '../../../domain/programSuggestions';
import { InlineProblem } from '../../InlineProblem';
import { WIDGET_TITLE_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { PlanBlockList, type BlocksUpdate } from './PlanBlockList';
import { PlanTimeline } from '../../program-view/PlanTimeline';

type PlanOverviewProps = {
  content: ProgramContent;
  dayOne: Date | null;
  preferredWeekday: Weekday;
  today: Date;
  level: LevelHint;
  onChange: (update: BlocksUpdate) => void;
  onOpenBlock: (blockId: string) => void;
  onUseSuggestion: () => void;
};

const LEVEL_LABELS: Record<LevelHint, string> = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
};

function SuggestionBanner({ level, onUse }: { level: LevelHint; onUse: () => void }) {
  const plan = suggestedBlocks(level)
    .map(block => `${BLOCK_TYPE_LABELS[block.type]} ${block.weeks} wk`)
    .join(' → ');
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface-base p-4">
      <p className="text-sm text-text-primary">{`Suggested for a ${LEVEL_LABELS[level]} client: ${plan}`}</p>
      <Button size="sm" onClick={onUse}>
        Use suggestion
      </Button>
    </div>
  );
}

export function PlanOverview({ content, dayOne, preferredWeekday, today, level, onChange, onOpenBlock, onUseSuggestion }: PlanOverviewProps) {
  const { blocks } = content.plan;
  const problems = sequenceProblems(blocks);

  return (
    <section className="grid grid-cols-1 gap-6">
      <h2 className={WIDGET_TITLE_CLASS}>Plan overview</h2>
      {blocks.length === 0 ? (
        <SuggestionBanner level={level} onUse={onUseSuggestion} />
      ) : (
        <>
          <PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday={preferredWeekday} today={today} />
          <PlanBlockList
            blocks={blocks}
            statuses={blocks.map((_, index) => blockStatus({ blocks, dayOne, today }, index))}
            dayOne={dayOne}
            today={today}
            onChange={onChange}
            onOpenBlock={onOpenBlock}
          />
        </>
      )}
      {problems.length > 0 && (
        <ul aria-label="Plan problems" className="grid gap-2">
          {problems.map(problem => (
            <li key={`${problem.code}:${problem.blockId ?? ''}`}>
              <InlineProblem>{blockingMessage(problem)}</InlineProblem>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
