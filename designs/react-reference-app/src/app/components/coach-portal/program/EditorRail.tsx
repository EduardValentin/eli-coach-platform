import { useId, type ReactNode } from 'react';
import { GanttChart, Plus } from 'lucide-react';
import { BLOCK_TYPE_LABELS, filledSessionCount, type Block, type CycleMode, type ProgramContent } from '../../../domain/program';
import { blockSpan, blockStatus, daysUntil, type PlanSchedule } from '../../../domain/programCalendar';
import { formatJourneyDate } from '../../../utils/journeyLabels';
import { LABEL_CLASS } from '../../typography';
import { cn } from '../../ui/utils';
import { isSameSection, sectionTitle, type EditorSection } from './editorSection';
import { PlanStrip } from './PlanTimeline';
import { BLOCK_SWATCH } from './program-constants';

type EditorRailProps = {
  content: ProgramContent;
  cycleMode: CycleMode;
  dayOne: Date | null;
  today: Date;
  selected: EditorSection;
  onSelect: (section: EditorSection) => void;
  onAddBlock: () => void;
};

type Detail = { text: string; tone: 'muted' | 'warning' | 'default' };

const ENTRY_CLASS = 'w-full rounded-field text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

function weekSpan(startWeek: number, endWeek: number): string {
  return startWeek === endWeek ? `week ${startWeek}` : `weeks ${startWeek}–${endWeek}`;
}

function blockDetail(schedule: PlanSchedule, index: number): Detail {
  const { blocks, today } = schedule;
  const block = blocks[index];
  const status = blockStatus(schedule, index);
  if (status.kind === 'ended') return { text: `ended ${formatJourneyDate(status.end)}`, tone: 'muted' };
  if (status.kind === 'current') {
    const calibration = status.calibration ? ' · calibration' : '';
    return {
      text: `week ${status.weekOfBlock} of ${block.weeks}${calibration}`,
      tone: 'default',
    };
  }
  const { startWeek, endWeek } = blockSpan(blocks, index);
  const empty = filledSessionCount(block) === 0;
  const when = status.start ? `starts in ${daysUntil(today, status.start)} days` : weekSpan(startWeek, endWeek);
  if (empty) return { text: `${when} · empty`, tone: 'warning' };
  return {
    text: status.start ? `starts ${formatJourneyDate(status.start)}` : when,
    tone: 'muted',
  };
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

function RailEntry({ current, onClick, children }: { current: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <li>
      <button
        type="button"
        aria-current={current ? 'true' : undefined}
        onClick={onClick}
        className={cn(ENTRY_CLASS, 'px-3 py-2 text-text-label hover:bg-surface-quiet hover:text-text-primary', {
          'bg-surface-quiet font-medium text-text-primary': current,
        })}
      >
        {children}
      </button>
    </li>
  );
}

function BlockEntry({
  blocks,
  index,
  detail,
  current,
  onClick,
}: {
  blocks: readonly Block[];
  index: number;
  detail: Detail;
  current: boolean;
  onClick: () => void;
}) {
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
          <span className="text-xs tabular-nums text-text-secondary">{` ${block.weeks} wk · ${filledSessionCount(block)}/${block.sessions.length}`}</span>
        </span>
        <span
          className={cn('text-xs', {
            'text-text-secondary': detail.tone === 'muted',
            'text-warning': detail.tone === 'warning',
            'text-text-label': detail.tone === 'default',
          })}
        >
          {` ${detail.text}`}
        </span>
      </button>
    </li>
  );
}

export function EditorRail({ content, cycleMode, dayOne, today, selected, onSelect, onAddBlock }: EditorRailProps) {
  const { blocks } = content.plan;
  const overview: EditorSection = { kind: 'plan' };
  const overviewCurrent = isSameSection(overview, selected);
  const entry = (section: EditorSection) => (
    <RailEntry current={isSameSection(section, selected)} onClick={() => onSelect(section)}>
      {sectionTitle(section, blocks)}
    </RailEntry>
  );

  return (
    <nav aria-label="Program sections" className="grid content-start gap-6 p-3">
      <button
        type="button"
        aria-current={overviewCurrent ? 'true' : undefined}
        onClick={() => onSelect(overview)}
        className={cn(ENTRY_CLASS, 'grid gap-2.5 border border-border bg-surface-base p-3 hover:bg-surface-quiet', {
          'border-primary/40 bg-surface-quiet shadow-card': overviewCurrent,
        })}
      >
        <span className="flex items-center gap-2 font-semibold text-text-primary">
          <GanttChart aria-hidden="true" size={18} />
          Overview
        </span>
        <PlanStrip blocks={blocks} dayOne={dayOne} today={today} />
      </button>
      <RailGroup title="Blocks">
        {blocks.map((block, index) => {
          const section: EditorSection = { kind: 'block', blockId: block.id };
          return (
            <BlockEntry
              key={block.id}
              blocks={blocks}
              index={index}
              detail={blockDetail({ blocks, dayOne, today }, index)}
              current={isSameSection(section, selected)}
              onClick={() => onSelect(section)}
            />
          );
        })}
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
      </RailGroup>
      <RailGroup title="Program">
        {entry({ kind: 'header' })}
        {cycleMode !== 'general' && entry({ kind: 'cycle' })}
        {entry({ kind: 'nutrition' })}
        {entry({ kind: 'lifestyle' })}
      </RailGroup>
    </nav>
  );
}
