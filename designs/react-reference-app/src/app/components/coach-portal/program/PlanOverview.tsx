import type { ReactNode } from 'react';
import { addDays } from 'date-fns';
import { CalendarRange, ClipboardCheck, Flag, type LucideIcon } from 'lucide-react';
import { BLOCK_TYPE_LABELS, type Block, type LevelHint, type ProgramContent, type Weekday } from '../../../domain/program';
import { blockStatus, checkpointDate, nextCheckpoint, planWeeks } from '../../../domain/programCalendar';
import { blockingMessage, blockingProblems, type BlockingCode, type RuleContext } from '../../../domain/programRules';
import { suggestedBlocks } from '../../../domain/programSuggestions';
import { formatJourneyDate } from '../../../utils/journeyLabels';
import { InlineProblem } from '../../InlineProblem';
import { WIDGET_TITLE_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { PlanBlockList, type BlocksUpdate } from './PlanBlockList';
import { PlanTimeline } from './PlanTimeline';

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

const SEQUENCE_CODES: readonly BlockingCode[] = ['foundation-not-first', 'starts-with-deload', 'consecutive-deloads', 'deload-not-one-week'];
const LEVEL_LABELS: Record<LevelHint, string> = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
};

function sequenceProblems(content: ProgramContent, props: PlanOverviewProps) {
  const ctx: RuleContext = {
    versionNumber: 1,
    publishDay: props.today,
    dayOne: props.dayOne,
    preferredWeekday: props.preferredWeekday,
    level: props.level,
    startDate: null,
    detailsPending: false,
    publishedBlocks: null,
    exercisesById: new Map(),
  };
  return blockingProblems(content, '', ctx).filter(finding => SEQUENCE_CODES.includes(finding.code));
}

const DAYS_PER_WEEK = 7;

function SummaryChip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-base px-3 py-1.5 text-sm text-text-primary">
      <Icon aria-hidden="true" size={16} className="text-text-secondary" />
      {children}
    </li>
  );
}

function nextCheckInForm(blocks: readonly Block[], { dayOne, preferredWeekday, today }: PlanOverviewProps): Date | null {
  const planEnd = addDays(dayOne ?? today, planWeeks(blocks) * DAYS_PER_WEEK - 1);
  const next = dayOne ? nextCheckpoint(dayOne, preferredWeekday, today) : checkpointDate(today, preferredWeekday, 1);
  return next <= planEnd ? next : null;
}

function PlanSummary({ blocks, props }: { blocks: readonly Block[]; props: PlanOverviewProps }) {
  const next = nextCheckInForm(blocks, props);
  return (
    <ul aria-label="Plan summary" className="flex flex-wrap gap-2">
      <SummaryChip icon={CalendarRange}>{`${planWeeks(blocks)} weeks`}</SummaryChip>
      <SummaryChip icon={Flag}>{props.dayOne ? `Starts ${formatJourneyDate(props.dayOne)}` : 'Starts on publication'}</SummaryChip>
      {next && <SummaryChip icon={ClipboardCheck}>{`Next check-in form ${formatJourneyDate(next)}`}</SummaryChip>}
    </ul>
  );
}

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

export function PlanOverview(props: PlanOverviewProps) {
  const { content, dayOne, preferredWeekday, today, level, onChange, onOpenBlock, onUseSuggestion } = props;
  const { blocks } = content.plan;
  const problems = sequenceProblems(content, props);

  return (
    <section className="grid grid-cols-1 gap-6">
      <h2 className={WIDGET_TITLE_CLASS}>Plan overview</h2>
      {blocks.length === 0 ? (
        <SuggestionBanner level={level} onUse={onUseSuggestion} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            <PlanSummary blocks={blocks} props={props} />
            <PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday={preferredWeekday} today={today} />
          </div>
          <PlanBlockList
            blocks={blocks}
            statuses={blocks.map((_, index) => blockStatus(blocks, index, dayOne, today))}
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
