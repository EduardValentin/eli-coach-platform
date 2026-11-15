import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { Link, type To } from 'react-router';
import { AlertCircle, GanttChart, Plus } from 'lucide-react';
import { BLOCK_TYPE_LABELS, filledSessionCount, type Block, type ProgramLanguage, type ProgramVersion } from '../../../domain/program';
import { blockSpan, blockStatus, type PlanSchedule } from '../../../domain/programCalendar';
import { sequenceProblems } from '../../../domain/programRules';
import { blockTexts, programWideTexts, textProgress, type ProgramTextTarget } from '../../../domain/programTexts';
import { counted } from '../../../utils/counted';
import { formatJourneyDate } from '../../../utils/journeyLabels';
import { EYEBROW_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { TabsList, TabsTrigger } from '../../ui/tabs';
import { cn } from '../../ui/utils';
import { EDITOR_MODE_LABELS, isSameSection, type EditorMode, type EditorSection } from './editorSection';
import { BLOCK_SWATCH } from '../../program-view/blockColours';
import { PlanStrip } from '../../program-view/PlanTimeline';
import { currentWeekText, endedText } from './blockParts';

type EditorRailProps = {
  mode: EditorMode;
  version: ProgramVersion;
  language: ProgramLanguage;
  dayOne: Date | null;
  today: Date;
  selected: EditorSection;
  locationOf: (mode: EditorMode, section: EditorSection) => To;
  onSelect: (section: EditorSection) => void;
  onSwitchMode: () => void;
  onAddBlock: () => void;
};

type Detail = { text: string; tone: 'muted' | 'warning' | 'default' };

const ENTRY_CLASS = 'w-full rounded-field text-left text-sm transition-colors';
const MODES: readonly EditorMode[] = ['structure', 'texts'];
const OVERVIEW: EditorSection = { kind: 'plan' };

function weekSpan(startWeek: number, endWeek: number): string {
  return startWeek === endWeek ? `week ${startWeek}` : `weeks ${startWeek}–${endWeek}`;
}

function dateDetail(schedule: PlanSchedule, index: number): Detail {
  const { blocks } = schedule;
  const status = blockStatus(schedule, index);
  if (status.kind === 'ended') return { text: endedText(status), tone: 'muted' };
  if (status.kind === 'current') return { text: currentWeekText(blocks[index], status), tone: 'default' };
  if (status.start) return { text: `starts ${formatJourneyDate(status.start)}`, tone: 'muted' };
  const { startWeek, endWeek } = blockSpan(blocks, index);
  return { text: weekSpan(startWeek, endWeek), tone: 'muted' };
}

function structureDetails(schedule: PlanSchedule, index: number): Detail[] {
  const block = schedule.blocks[index];
  const empty = block.sessions.length - filledSessionCount(block);
  const dates = dateDetail(schedule, index);
  return empty > 0 ? [dates, { text: `${counted(empty, 'session')} empty`, tone: 'warning' }] : [dates];
}

function blocksWithProblems(blocks: readonly Block[]): Set<string> {
  return new Set(sequenceProblems(blocks).flatMap(problem => (problem.blockId ? [problem.blockId] : [])));
}

function textsDetail(version: ProgramVersion, targets: readonly ProgramTextTarget[], language: ProgramLanguage): Detail {
  const { toWrite, pending } = textProgress(version, targets, language);
  if (toWrite + pending === 0) return { text: 'All texts ready', tone: 'muted' };
  const parts = [toWrite > 0 ? `${toWrite} to write` : '', pending > 0 ? `${pending} need Romanian` : ''];
  return { text: parts.filter(Boolean).join(' · '), tone: 'warning' };
}

function DetailLine({ detail }: { detail: Detail }) {
  return (
    <span
      className={cn('text-xs', {
        'text-text-secondary': detail.tone === 'muted',
        'text-warning': detail.tone === 'warning',
        'text-text-label': detail.tone === 'default',
      })}
    >
      {` ${detail.text}`}
    </span>
  );
}

function ProblemMark() {
  return (
    <span className="text-destructive">
      <AlertCircle aria-hidden="true" size={16} />
      <span className="sr-only"> has a problem</span>
    </span>
  );
}

function RailGroup({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <div className="grid gap-2">
      <p id={titleId} className={cn(EYEBROW_CLASS, 'px-3')}>
        {title}
      </p>
      <ul aria-labelledby={titleId} className="grid gap-2">
        {children}
      </ul>
    </div>
  );
}

type BlockEntryProps = {
  block: Block;
  index: number;
  details: readonly Detail[];
  problem: boolean;
  current: boolean;
  onClick: () => void;
};

function BlockEntry({ block, index, details, problem, current, onClick }: BlockEntryProps) {
  return (
    <li>
      <button
        type="button"
        aria-current={current ? 'true' : undefined}
        onClick={onClick}
        className={cn(
          ENTRY_CLASS,
          'relative grid gap-0.5 overflow-hidden border border-control-border-soft bg-surface-base py-2 pr-3 pl-4 hover:bg-surface-quiet',
          { 'border-text-primary bg-surface-quiet shadow-card': current },
        )}
      >
        <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', BLOCK_SWATCH[block.type])} />
        <span className="flex items-center justify-between gap-2 font-medium text-text-primary">
          {`${index + 1} ${BLOCK_TYPE_LABELS[block.type]}`}
          {problem && <ProblemMark />}
        </span>
        {details.map(detail => (
          <DetailLine key={detail.text} detail={detail} />
        ))}
      </button>
    </li>
  );
}

function activateOnSpace(event: KeyboardEvent<HTMLAnchorElement>) {
  if (event.key !== ' ') return;
  event.preventDefault();
  event.currentTarget.click();
}

function ModeSwitch({ selected, locationOf, onSwitchMode }: Pick<EditorRailProps, 'selected' | 'locationOf' | 'onSwitchMode'>) {
  return (
    <TabsList aria-label="Editing mode" className="w-full">
      {MODES.map(option => (
        <TabsTrigger key={option} value={option} asChild>
          <Link to={locationOf(option, selected)} onClick={onSwitchMode} onKeyDown={activateOnSpace}>
            {EDITOR_MODE_LABELS[option]}
          </Link>
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

export function EditorRail(props: EditorRailProps) {
  const { mode, version, language, dayOne, today, selected, onSelect, onAddBlock } = props;
  const { blocks } = version.content.plan;
  const overviewCurrent = isSameSection(OVERVIEW, selected);
  const writing = mode === 'texts';
  const flagged = writing ? new Set<string>() : blocksWithProblems(blocks);

  return (
    <div className="grid content-start gap-6 p-3">
      <ModeSwitch {...props} />
      <nav aria-label="Program sections" className="grid content-start gap-6">
        <button
          type="button"
          aria-current={overviewCurrent ? 'true' : undefined}
          onClick={() => onSelect(OVERVIEW)}
          className={cn(ENTRY_CLASS, 'grid gap-2.5 border border-control-border-soft bg-surface-base p-3 hover:bg-surface-quiet', {
            'border-text-primary bg-surface-quiet shadow-card': overviewCurrent,
          })}
        >
          <span className="flex items-center gap-2 font-semibold text-text-primary">
            <GanttChart aria-hidden="true" size={18} />
            Overview
          </span>
          <PlanStrip blocks={blocks} dayOne={dayOne} today={today} />
          {writing && <DetailLine detail={textsDetail(version, programWideTexts(version), language)} />}
        </button>
        <RailGroup title="Blocks">
          {blocks.map((block, index) => {
            const section: EditorSection = { kind: 'block', blockId: block.id };
            return (
              <BlockEntry
                key={block.id}
                block={block}
                index={index}
                details={writing ? [textsDetail(version, blockTexts(block), language)] : structureDetails({ blocks, dayOne, today }, index)}
                problem={flagged.has(block.id)}
                current={isSameSection(section, selected)}
                onClick={() => onSelect(section)}
              />
            );
          })}
          {!writing && (
            <li>
              <Button variant="ghost" className="w-full justify-start has-[>svg]:px-4" onClick={onAddBlock}>
                <Plus aria-hidden="true" />
                Add block
              </Button>
            </li>
          )}
        </RailGroup>
      </nav>
    </div>
  );
}
