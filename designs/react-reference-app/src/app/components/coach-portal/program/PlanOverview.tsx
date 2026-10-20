import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import {
  BLOCK_TYPE_LABELS,
  BLOCK_TYPES,
  filledSessionCount,
  type Block,
  type BlockType,
  type LevelHint,
  type ProgramContent,
  type Weekday,
} from '../../../domain/program';
import { blockStatus, type BlockStatus } from '../../../domain/programCalendar';
import { blockingMessage, blockingProblems, type BlockingCode, type RuleContext } from '../../../domain/programRules';
import { suggestedBlocks } from '../../../domain/programSuggestions';
import { formatJourneyDate } from '../../../utils/journeyLabels';
import { InlineProblem } from '../../InlineProblem';
import { WIDGET_TITLE_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { cn } from '../../ui/utils';
import { PlanTimeline } from './PlanTimeline';
import { BLOCK_SWATCH, SPLIT_SHAPE_LABELS } from './program-constants';
import { blockWithType, useWeeksField } from './weeksField';

export type BlocksUpdate = (blocks: Block[]) => Block[];

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

const SEQUENCE_CODES: readonly BlockingCode[] = [
  'foundation-not-first',
  'starts-with-deload',
  'consecutive-deloads',
  'deload-not-one-week',
];
const LEVEL_LABELS: Record<LevelHint, string> = { beginner: 'beginner', intermediate: 'intermediate', advanced: 'advanced' };
const CELL_CLASS = 'px-3 py-2';

function replaceAt(blocks: Block[], index: number, block: Block): Block[] {
  return blocks.map((other, at) => (at === index ? block : other));
}

function swap(blocks: Block[], index: number, other: number): Block[] {
  const next = [...blocks];
  [next[index], next[other]] = [next[other], next[index]];
  return next;
}

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

function WeeksInput({
  blocks,
  index,
  status,
  dayOne,
  today,
  onCommit,
}: {
  blocks: Block[];
  index: number;
  status: BlockStatus;
  dayOne: Date | null;
  today: Date;
  onCommit: (weeks: number) => void;
}) {
  const weeks = useWeeksField({ blocks, index, status, dayOne, today, onCommit });
  return (
    <div className="grid gap-1">
      <Input size="sm" className="w-20" aria-label={`Weeks of block ${index + 1}`} {...weeks.inputProps} />
      {weeks.problem && <InlineProblem id={weeks.problemId}>{weeks.problem}</InlineProblem>}
    </div>
  );
}

function BlockTypeCell({ block, index, status, onType }: { block: Block; index: number; status: BlockStatus; onType: (type: BlockType) => void }) {
  if (status.kind === 'ended') {
    return (
      <div className="grid">
        <span className="text-sm text-text-primary">{BLOCK_TYPE_LABELS[block.type]}</span>
        <span className="text-xs text-text-secondary">{`ended ${formatJourneyDate(status.end)}`}</span>
      </div>
    );
  }
  return (
    <Select value={block.type} onValueChange={value => onType(value as BlockType)}>
      <SelectTrigger size="sm" className="w-36" aria-label={`Type of block ${index + 1}`}>
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

function SuggestionBanner({ level, onUse }: { level: LevelHint; onUse: () => void }) {
  const plan = suggestedBlocks(level)
    .map(block => `${BLOCK_TYPE_LABELS[block.type]} ${block.weeks} wk`)
    .join(' → ');
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-field border border-border bg-surface-base p-4">
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
  const statuses = blocks.map((_, index) => blockStatus(blocks, index, dayOne, today));
  const locked = statuses.map(status => status.kind !== 'upcoming');
  const problems = sequenceProblems(content, props);

  return (
    <section className="grid grid-cols-1 gap-6">
      <h2 className={WIDGET_TITLE_CLASS}>Plan overview</h2>
      {blocks.length === 0 ? (
        <SuggestionBanner level={level} onUse={onUseSuggestion} />
      ) : (
        <PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday={preferredWeekday} today={today} />
      )}
      {blocks.length > 0 && (
        <div className="rounded-field border border-border bg-surface-base">
          <Table aria-label="Blocks">
            <TableHeader>
              <TableRow>
                <TableHead className={CELL_CLASS}>#</TableHead>
                <TableHead className={CELL_CLASS}>Block</TableHead>
                <TableHead className={CELL_CLASS}>Weeks</TableHead>
                <TableHead className={CELL_CLASS}>Split</TableHead>
                <TableHead className={CELL_CLASS}>Sessions</TableHead>
                <TableHead className={CELL_CLASS}>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blocks.map((block, index) => {
                const n = index + 1;
                const filled = filledSessionCount(block);
                const total = block.sessions.length;
                const canMoveUp = !locked[index] && index > 0 && !locked[index - 1];
                const canMoveDown = !locked[index] && index < blocks.length - 1;
                return (
                  <TableRow key={block.id}>
                    <TableCell className={CELL_CLASS}>
                      <span className="flex items-center gap-2 tabular-nums">
                        <span aria-hidden="true" className={cn('size-2 rounded-full', BLOCK_SWATCH[block.type])} />
                        {n}
                      </span>
                    </TableCell>
                    <TableCell className={CELL_CLASS}>
                      <BlockTypeCell
                        block={block}
                        index={index}
                        status={statuses[index]}
                        onType={type => onChange(current => replaceAt(current, index, blockWithType(current[index], type)))}
                      />
                    </TableCell>
                    <TableCell className={CELL_CLASS}>
                      <WeeksInput
                        key={block.id}
                        blocks={blocks}
                        index={index}
                        status={statuses[index]}
                        dayOne={dayOne}
                        today={today}
                        onCommit={weeks => onChange(current => replaceAt(current, index, { ...current[index], weeks }))}
                      />
                    </TableCell>
                    <TableCell className={cn(CELL_CLASS, 'text-text-label')}>
                      {block.split.name || SPLIT_SHAPE_LABELS[block.split.shape]}
                    </TableCell>
                    <TableCell className={cn(CELL_CLASS, { 'text-warning': filled < total, 'text-text-label': filled === total })}>
                      {`${filled} of ${total} filled`}
                    </TableCell>
                    <TableCell className={cn(CELL_CLASS, 'text-right')}>
                      {statuses[index].kind !== 'ended' && (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="xs" aria-label={`Open block ${n}`} onClick={() => onOpenBlock(block.id)}>
                            Open
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Move block ${n} up`}
                            disabled={!canMoveUp}
                            onClick={() => onChange(current => swap(current, index, index - 1))}
                          >
                            <ArrowUp aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Move block ${n} down`}
                            disabled={!canMoveDown}
                            onClick={() => onChange(current => swap(current, index, index + 1))}
                          >
                            <ArrowDown aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove block ${n}`}
                            disabled={locked[index]}
                            onClick={() => onChange(current => current.filter((_, at) => at !== index))}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
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
