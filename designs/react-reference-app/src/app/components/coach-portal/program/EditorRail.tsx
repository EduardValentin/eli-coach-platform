import { useId, type ReactNode } from 'react';
import type { To } from 'react-router';
import { AlertCircle, GanttChart, Plus } from 'lucide-react';
import { BLOCK_TYPE_LABELS, filledSessionCount, type Block, type ProgramLanguage, type ProgramVersion } from '../../../domain/program';
import { blockSpan, blockStatus, type PlanSchedule } from '../../../domain/programCalendar';
import { blockingMessage, sequenceProblems } from '../../../domain/programRules';
import { blockTexts, programWideTexts, textProgress, type ProgramTextTarget } from '../../../domain/programTexts';
import { counted } from '../../../utils/counted';
import { formatJourneyDate } from '../../../utils/journeyLabels';
import { LABEL_CLASS } from '../../typography';
import { SegmentedNav } from '../../ui/segmented-nav';
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
  onAddBlock: () => void;
  onSwitchMode: () => void;
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

function problemsByBlock(blocks: readonly Block[]): Map<string, string> {
  const problems = new Map<string, string>();
  for (const problem of sequenceProblems(blocks)) {
    if (problem.blockId && !problems.has(problem.blockId)) problems.set(problem.blockId, blockingMessage(problem));
  }
  return problems;
}

function textsDetail(version: ProgramVersion, targets: readonly ProgramTextTarget[], language: ProgramLanguage): Detail {
  const { toWrite, pending } = textProgress(version, targets, language);
  const writing = toWrite === 0 ? 'All texts ready' : `${toWrite} to write`;
  const romanian = pending === 0 ? '' : ` · ${pending} need Romanian`;
  return { text: `${writing}${romanian}`, tone: toWrite + pending === 0 ? 'muted' : 'warning' };
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

function ProblemLine({ problem }: { problem: string }) {
  return (
    <span className="flex items-start gap-1 text-xs text-destructive">
      <AlertCircle aria-hidden="true" size={14} className="mt-px shrink-0" />
      {` ${problem}`}
    </span>
  );
}

function RailGroup({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <div className="grid gap-2">
      <p id={titleId} className={cn(LABEL_CLASS, 'px-3')}>
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
  problem: string | undefined;
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
          { 'border-text-primary shadow-card': current },
        )}
      >
        <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', BLOCK_SWATCH[block.type])} />
        <span className="font-medium text-text-primary">{`${index + 1} ${BLOCK_TYPE_LABELS[block.type]}`}</span>
        {details.map(detail => (
          <DetailLine key={detail.text} detail={detail} />
        ))}
        {problem && <ProblemLine problem={problem} />}
      </button>
    </li>
  );
}

function ModeSwitch({ mode, selected, locationOf, onSwitchMode }: Pick<EditorRailProps, 'mode' | 'selected' | 'locationOf' | 'onSwitchMode'>) {
  const items = MODES.map(option => ({ label: EDITOR_MODE_LABELS[option], to: locationOf(option, selected), current: option === mode }));
  return <SegmentedNav label="Editing mode" items={items} onNavigate={onSwitchMode} className="w-full" />;
}

export function EditorRail(props: EditorRailProps) {
  const { mode, version, language, dayOne, today, selected, onSelect, onAddBlock } = props;
  const { blocks } = version.content.plan;
  const overviewCurrent = isSameSection(OVERVIEW, selected);
  const writing = mode === 'texts';
  const problems = writing ? new Map<string, string>() : problemsByBlock(blocks);

  return (
    <div className="grid content-start gap-6 p-3">
      <ModeSwitch {...props} />
      <nav aria-label="Program sections" className="grid content-start gap-6">
        <button
          type="button"
          aria-current={overviewCurrent ? 'true' : undefined}
          onClick={() => onSelect(OVERVIEW)}
          className={cn(ENTRY_CLASS, 'grid gap-2.5 border border-control-border-soft bg-surface-base p-3 hover:bg-surface-quiet', {
            'border-text-primary shadow-card': overviewCurrent,
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
                problem={problems.get(block.id)}
                current={isSameSection(section, selected)}
                onClick={() => onSelect(section)}
              />
            );
          })}
          {!writing && (
            <li>
              <button
                type="button"
                onClick={onAddBlock}
                className={cn(ENTRY_CLASS, 'relative hit-area flex min-h-12 items-center gap-2 border border-dashed border-control-border-soft px-3 py-2 text-primary hover:bg-surface-quiet')}
              >
                <Plus aria-hidden="true" size={16} />
                Add block
              </button>
            </li>
          )}
        </RailGroup>
      </nav>
    </div>
  );
}
