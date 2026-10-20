import { useId, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { BLOCK_TYPE_LABELS, filledSessionCount, type Block, type CycleMode, type ProgramContent } from '../../../domain/program';
import { blockSpan, blockStatus, daysUntil, planWeeks } from '../../../domain/programCalendar';
import { formatJourneyDate } from '../../../utils/journeyLabels';
import { LABEL_CLASS } from '../../typography';
import { cn } from '../../ui/utils';
import { isSameSection, type EditorSection } from './editorSection';
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

function blockDetail(blocks: readonly Block[], index: number, dayOne: Date | null, today: Date): Detail {
  const block = blocks[index];
  const status = blockStatus(blocks, index, dayOne, today);
  if (status.kind === 'ended') return { text: `ended ${formatJourneyDate(status.end)}`, tone: 'muted' };
  if (status.kind === 'current') {
    const calibration = status.calibration ? ' · calibration' : '';
    return { text: `week ${status.weekOfBlock} of ${block.weeks}${calibration}`, tone: 'default' };
  }
  const { startWeek, endWeek } = blockSpan(blocks, index);
  const empty = filledSessionCount(block) === 0;
  const when = status.start ? `starts in ${daysUntil(today, status.start)} days` : `weeks ${startWeek}–${endWeek}`;
  if (empty) return { text: `${when} · empty`, tone: 'warning' };
  return { text: status.start ? `starts ${formatJourneyDate(status.start)}` : when, tone: 'muted' };
}

function RailGroup({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <div className="grid gap-1">
      <p id={titleId} className={cn(LABEL_CLASS, 'px-3')}>
        {title}
      </p>
      <ul aria-labelledby={titleId} className="grid gap-0.5">
        {children}
      </ul>
    </div>
  );
}

function RailEntry({
  current,
  onClick,
  children,
}: {
  current: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        aria-current={current ? 'true' : undefined}
        onClick={onClick}
        className={cn(
          'grid w-full gap-0.5 rounded-field px-3 py-2 text-left text-sm text-text-label transition-colors hover:bg-surface-quiet hover:text-text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          { 'bg-surface-quiet font-medium text-text-primary': current },
        )}
      >
        {children}
      </button>
    </li>
  );
}

export function EditorRail({ content, cycleMode, dayOne, today, selected, onSelect, onAddBlock }: EditorRailProps) {
  const { blocks } = content.plan;
  const entry = (section: EditorSection, label: string) => (
    <RailEntry current={isSameSection(section, selected)} onClick={() => onSelect(section)}>
      {label}
    </RailEntry>
  );

  return (
    <nav aria-label="Program sections" className="grid content-start gap-5 p-3">
      <RailGroup title="Program">{entry({ kind: 'header' }, 'Header & focus')}</RailGroup>
      <RailGroup title={`Plan · ${planWeeks(blocks)} weeks`}>
        {blocks.map((block, index) => {
          const detail = blockDetail(blocks, index, dayOne, today);
          const section: EditorSection = { kind: 'block', blockId: block.id };
          return (
            <RailEntry key={block.id} current={isSameSection(section, selected)} onClick={() => onSelect(section)}>
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', BLOCK_SWATCH[block.type])} />
                {`${index + 1} ${BLOCK_TYPE_LABELS[block.type]} · ${block.weeks} wk`}
              </span>
              <span
                className={cn('block pl-4 text-xs font-normal', {
                  'text-text-secondary': detail.tone === 'muted',
                  'text-warning': detail.tone === 'warning',
                  'text-text-label': detail.tone === 'default',
                })}
              >
                {` ${detail.text}`}
              </span>
            </RailEntry>
          );
        })}
        {entry({ kind: 'plan' }, 'Plan overview')}
        <li>
          <button
            type="button"
            onClick={onAddBlock}
            className="flex w-full items-center gap-2 rounded-field px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-surface-quiet focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Plus aria-hidden="true" size={16} />
            Add block
          </button>
        </li>
      </RailGroup>
      <RailGroup title="Whole program">
        {cycleMode !== 'general' && entry({ kind: 'cycle' }, 'Cycle rules')}
        {entry({ kind: 'nutrition' }, 'Nutrition')}
        {entry({ kind: 'lifestyle' }, 'Lifestyle')}
      </RailGroup>
    </nav>
  );
}
