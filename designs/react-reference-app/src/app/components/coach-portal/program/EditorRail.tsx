import { useId, type ReactNode } from 'react';
import type { To } from 'react-router';
import { GanttChart, Plus } from 'lucide-react';
import { BLOCK_TYPE_LABELS, filledSessionCount, type Block, type ProgramLanguage, type ProgramVersion } from '../../../domain/program';
import { blockSpan, blockStatus, daysUntil, type PlanSchedule } from '../../../domain/programCalendar';
import { blockTexts, programWideTexts, textProgress, type ProgramTextTarget } from '../../../domain/programTexts';
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

function blockDetail(schedule: PlanSchedule, index: number): Detail {
  const { blocks, today } = schedule;
  const block = blocks[index];
  const status = blockStatus(schedule, index);
  if (status.kind === 'ended') return { text: endedText(status), tone: 'muted' };
  if (status.kind === 'current') return { text: `${currentWeekText(block, status)}${status.calibration ? ' · calibration' : ''}`, tone: 'default' };
  const { startWeek, endWeek } = blockSpan(blocks, index);
  const empty = filledSessionCount(block) === 0;
  const when = status.start ? `starts in ${daysUntil(today, status.start)} days` : weekSpan(startWeek, endWeek);
  if (empty) return { text: `${when} · empty`, tone: 'warning' };
  return {
    text: status.start ? `starts ${formatJourneyDate(status.start)}` : when,
    tone: 'muted',
  };
}

function textsDetail(version: ProgramVersion, targets: readonly ProgramTextTarget[], language: ProgramLanguage): Detail {
  const { written, total } = textProgress(version, targets, language);
  return { text: `${written} of ${total} texts written`, tone: 'muted' };
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

function RailGroup({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <div className="grid gap-1.5">
      <p id={titleId} className={cn(LABEL_CLASS, 'px-3')}>
        {title}
      </p>
      <ul aria-labelledby={titleId} className="grid gap-1">
        {children}
      </ul>
    </div>
  );
}

type BlockEntryProps = {
  blocks: readonly Block[];
  index: number;
  detail: Detail;
  figures: string | null;
  current: boolean;
  onClick: () => void;
};

function BlockEntry({ blocks, index, detail, figures, current, onClick }: BlockEntryProps) {
  const block = blocks[index];
  return (
    <li>
      <button
        type="button"
        aria-current={current ? 'true' : undefined}
        onClick={onClick}
        className={cn(
          ENTRY_CLASS,
          'relative grid gap-0.5 overflow-hidden border border-border-subtle bg-surface-base py-2 pr-3 pl-4 hover:border-border hover:bg-surface-quiet',
          { 'border-border bg-surface-quiet shadow-card': current },
        )}
      >
        <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', BLOCK_SWATCH[block.type])} />
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-medium text-text-primary">{`${index + 1} ${BLOCK_TYPE_LABELS[block.type]}`}</span>
          {figures && <span className="text-xs tabular-nums text-text-secondary">{` ${figures}`}</span>}
        </span>
        <DetailLine detail={detail} />
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

  return (
    <div className="grid content-start gap-6 p-3">
      <ModeSwitch {...props} />
      <nav aria-label="Program sections" className="grid content-start gap-6">
        <button
          type="button"
          aria-current={overviewCurrent ? 'true' : undefined}
          onClick={() => onSelect(OVERVIEW)}
          className={cn(ENTRY_CLASS, 'grid gap-2.5 border border-border bg-surface-base p-3 hover:bg-surface-quiet', {
            'border-primary/40 bg-surface-quiet shadow-card': overviewCurrent,
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
                blocks={blocks}
                index={index}
                detail={writing ? textsDetail(version, blockTexts(block), language) : blockDetail({ blocks, dayOne, today }, index)}
                figures={writing ? null : `${block.weeks} wk · ${filledSessionCount(block)}/${block.sessions.length}`}
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
                className={cn(ENTRY_CLASS, 'flex items-center gap-2 border border-dashed border-border px-3 py-2 text-primary hover:bg-surface-quiet')}
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
