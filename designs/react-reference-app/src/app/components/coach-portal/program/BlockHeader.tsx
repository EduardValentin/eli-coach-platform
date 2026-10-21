import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { ChevronDown, Copy, Info, RotateCcw, Trash2 } from 'lucide-react';
import type { ClientJourney } from '../../../domain/journey';
import {
  BLOCK_TYPE_LABELS,
  BLOCK_TYPES,
  type Block,
  type BlockType,
  type Program,
  type ProgramLanguage,
  type Session,
  type SplitShape,
} from '../../../domain/program';
import type { BlockStatus } from '../../../domain/programCalendar';
import { STEPS_STEP, TARGET_MINUTES } from '../../../domain/programDefaults';
import { blockWithSessionsFrom } from '../../../domain/programEditing';
import { emptySessionsFor, spreadCalendar } from '../../../domain/programSuggestions';
import { fillTemplate, templateText } from '../../../domain/programTemplates';
import { formatJourneyDate } from '../../../utils/journeyLabels';
import { IconHint } from '../../IconHint';
import { InlineProblem } from '../../InlineProblem';
import { RowActionsMenu } from '../../RowActionsMenu';
import { LABEL_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { ConfirmDialog } from '../../ui/confirm-dialog';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Switch } from '../../ui/switch';
import { useIsDesktop } from '../../ui/use-desktop';
import { cn } from '../../ui/utils';
import { CopyBlockDialog } from './CopyBlockDialog';
import { OptionSelect, type Option } from './OptionSelect';
import { BLOCK_SWATCH, SPLIT_SHAPE_LABELS } from './program-constants';
import { blockWithType, useWeeksField } from './weeksField';

type BlockHeaderProps = {
  blocks: Block[];
  index: number;
  status: BlockStatus;
  dayOne: Date | null;
  today: Date;
  language: ProgramLanguage;
  otherPrograms: Program[];
  journeys: Record<string, ClientJourney>;
  onChange: (block: Block) => void;
  onRemove: () => void;
};

type PendingSessions = {
  title: string;
  description: string;
  confirmLabel: string;
  block: Block;
};

const SPLIT_SHAPES = Object.keys(SPLIT_SHAPE_LABELS) as SplitShape[];
const MIN_STEPS = 4000;
const MAX_STEPS = 12000;
const STARTED_REASON = 'A block that has started stays in the plan.';
const COLLAPSE_AFTER_PX = 80;
const CALIBRATION_HINT = 'Week 1 keeps the planned values; she stops 2–3 reps short while finding her weights.';

function stepOptions(current: number): Option<number>[] {
  const values = new Set<number>([current]);
  for (let steps = MIN_STEPS; steps <= MAX_STEPS; steps += STEPS_STEP) values.add(steps);
  return [...values].sort((a, b) => a - b).map(value => ({ value, label: value.toLocaleString('en-US') }));
}

function Setting({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-1.5">
      <span aria-hidden="true" className={LABEL_CLASS}>
        {label}
      </span>
      {children}
    </div>
  );
}

function useScrolledPast(threshold: number) {
  const ref = useRef<HTMLElement>(null);
  const [past, setPast] = useState(false);
  useEffect(() => {
    function onScroll(event: Event) {
      const container = event.target;
      if (!(container instanceof Element) || !ref.current || !container.contains(ref.current)) return;
      setPast(container.scrollTop > threshold);
    }
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, [threshold]);
  return { ref, past };
}

function BlockNumber({ block, index }: { block: Block; index: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-tile text-sm font-semibold text-primary-foreground tabular-nums',
        BLOCK_SWATCH[block.type],
      )}
    >
      {index + 1}
    </span>
  );
}

type SettingsToggleProps = { expanded: boolean; buttonRef: Ref<HTMLButtonElement>; onToggle: () => void };

function SettingsToggle({ expanded, buttonRef, onToggle }: SettingsToggleProps) {
  return (
    <Button ref={buttonRef} variant="ghost" size="icon-sm" aria-label="Block settings" aria-expanded={expanded} onClick={onToggle}>
      <ChevronDown aria-hidden="true" className={cn('transition-transform motion-reduce:transition-none', { 'rotate-180': expanded })} />
    </Button>
  );
}

function reshaped(block: Block, shape: SplitShape, language: ProgramLanguage): Block {
  const days = Object.values(block.calendar).filter(entry => entry.kind === 'session').length;
  const sessions = emptySessionsFor(shape, days);
  return {
    ...block,
    split: {
      ...block.split,
      shape,
      text: fillTemplate(templateText(`split.${shape}`, language).text, {
        days,
      }),
    },
    sessions,
    calendar: spreadCalendar(
      shape,
      sessions.map(session => session.id),
      block.cardioSessions,
    ),
  };
}

function hasExercises(block: Block): boolean {
  return block.sessions.some(session => session.rows.some(row => row.exerciseId !== ''));
}

function statusLine(block: Block, status: BlockStatus): string | null {
  if (status.kind === 'ended') return `Ended ${formatJourneyDate(status.end)}`;
  if (status.kind === 'current') return `Week ${status.weekOfBlock} of ${block.weeks}`;
  return status.start ? `Starts ${formatJourneyDate(status.start)}` : null;
}

export function BlockHeader({ blocks, index, status, dayOne, today, language, otherPrograms, journeys, onChange, onRemove }: BlockHeaderProps) {
  const block = blocks[index];
  const [copying, setCopying] = useState(false);
  const [pending, setPending] = useState<PendingSessions | null>(null);
  const lastPending = useRef<PendingSessions | null>(null);
  if (pending) lastPending.current = pending;
  const shownPending = pending ?? lastPending.current;
  const weeks = useWeeksField({
    blocks,
    index,
    status,
    dayOne,
    today,
    onCommit: value => onChange({ ...block, weeks: value }),
  });
  const scroll = useScrolledPast(COLLAPSE_AFTER_PX);
  const isDesktop = useIsDesktop();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsToggle = useRef<HTMLButtonElement>(null);
  const refocusToggle = useRef(false);
  const collapsible = isDesktop && scroll.past;
  const collapsed = collapsible && !settingsOpen;
  const line = statusLine(block, status);
  const splitLabel = SPLIT_SHAPE_LABELS[block.split.shape];

  useEffect(() => {
    if (!scroll.past) setSettingsOpen(false);
  }, [scroll.past]);

  useEffect(() => {
    if (!refocusToggle.current) return;
    refocusToggle.current = false;
    settingsToggle.current?.focus();
  }, [settingsOpen]);

  function toggleSettings() {
    refocusToggle.current = true;
    setSettingsOpen(open => !open);
  }

  function copySessions(sessions: Session[]) {
    setCopying(false);
    const next = blockWithSessionsFrom(block, sessions);
    if (!hasExercises(block)) onChange(next);
    else
      setPending({
        title: "Replace this block's sessions?",
        description: 'The sessions of the chosen block replace every session of this block.',
        confirmLabel: 'Replace sessions',
        block: next,
      });
  }

  function changeShape(shape: SplitShape) {
    const next = reshaped(block, shape, language);
    if (!hasExercises(block)) onChange(next);
    else
      setPending({
        title: 'Replace the sessions?',
        description: `Every session of this block is rebuilt from the ${SPLIT_SHAPE_LABELS[shape]} shape.`,
        confirmLabel: 'Replace sessions',
        block: next,
      });
  }

  function resetToSplit() {
    setPending({
      title: 'Reset to the split?',
      description: `Every session of this block is rebuilt from the ${splitLabel} split.`,
      confirmLabel: 'Reset sessions',
      block: reshaped(block, block.split.shape, language),
    });
  }

  return (
    <header
      ref={scroll.ref}
      className={cn('z-10 rounded-card border border-border bg-card shadow-card lg:sticky lg:-top-6', { 'lg:rounded-t-none lg:border-t-0': collapsed })}
    >
      <h2 className="sr-only">{BLOCK_TYPE_LABELS[block.type]}</h2>
      {collapsed ? (
        <div className="flex items-center gap-3 py-2 pr-2 pl-4">
          <BlockNumber block={block} index={index} />
          <p className="truncate text-base font-semibold text-text-primary">{`${BLOCK_TYPE_LABELS[block.type]} · ${block.weeks} wk`}</p>
          {line && <p className="truncate text-sm text-text-secondary">{line}</p>}
          <div className="ml-auto">
            <SettingsToggle expanded={false} buttonRef={settingsToggle} onToggle={toggleSettings} />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 border-b border-border-subtle py-2.5 pr-2 pl-4">
            <BlockNumber block={block} index={index} />
            <Select value={block.type} onValueChange={value => onChange(blockWithType(block, value as BlockType))}>
              <SelectTrigger
                aria-label="Block type"
                className="w-auto border-transparent bg-transparent px-2 text-lg font-semibold text-text-primary shadow-none hover:bg-surface-quiet md:text-lg"
              >
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
            {line && <p className="truncate text-sm text-text-secondary">{line}</p>}
            <div className="ml-auto flex items-center gap-1">
              {collapsible && <SettingsToggle expanded buttonRef={settingsToggle} onToggle={toggleSettings} />}
              <RowActionsMenu
                label="Block actions"
                parityRoot="BlockActionsMenu"
                actions={[
                  {
                    name: 'copy',
                    label: 'Copy from another client…',
                    icon: Copy,
                    onSelect: () => setCopying(true),
                  },
                  {
                    name: 'reset',
                    label: 'Reset to split',
                    icon: RotateCcw,
                    onSelect: resetToSplit,
                  },
                  {
                    name: 'remove',
                    label: 'Remove block',
                    icon: Trash2,
                    tone: 'destructive',
                    disabledReason: status.kind === 'upcoming' ? undefined : STARTED_REASON,
                    onSelect: onRemove,
                  },
                ]}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 px-4 py-3">
            <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
              <Setting label="Weeks">
                <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                  <Input size="sm" className="w-16 tabular-nums" aria-label="Weeks" {...weeks.inputProps} />
                  wk
                </span>
                {weeks.problem && <InlineProblem id={weeks.problemId}>{weeks.problem}</InlineProblem>}
              </Setting>
              {block.type !== 'deload' && (
                <Setting label="Calibration">
                  <span className="flex min-h-(--size-control-sm) items-center gap-1">
                    <label className="flex items-center gap-2 text-sm text-text-primary">
                      <Switch checked={block.calibrationWeek} onCheckedChange={checked => onChange({ ...block, calibrationWeek: checked })} />
                      Calibration week
                    </label>
                    <IconHint label="What a calibration week is" icon={<Info aria-hidden="true" size={14} />} size="compact" tone="muted">
                      {CALIBRATION_HINT}
                    </IconHint>
                  </span>
                </Setting>
              )}
            </div>
            <div className="flex flex-wrap items-start gap-x-4 gap-y-4">
              <Setting label="Split">
                <Select value={block.split.shape} onValueChange={value => changeShape(value as SplitShape)}>
                  <SelectTrigger size="sm" className="w-36" aria-label="Split shape">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPLIT_SHAPES.map(shape => (
                      <SelectItem key={shape} value={shape}>
                        {SPLIT_SHAPE_LABELS[shape]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Setting>
              <Setting label="Split name">
                <Input
                  size="sm"
                  className="w-40"
                  aria-label="Split name"
                  placeholder={splitLabel}
                  value={block.split.name}
                  onChange={event =>
                    onChange({
                      ...block,
                      split: { ...block.split, name: event.target.value },
                    })
                  }
                />
              </Setting>
              <Setting label="Target">
                <Select value={String(block.targetMinutes)} onValueChange={value => onChange({ ...block, targetMinutes: Number(value) })}>
                  <SelectTrigger size="sm" className="w-28" aria-label="Target minutes">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_MINUTES.map(minutes => (
                      <SelectItem key={minutes} value={String(minutes)}>
                        {`${minutes} min`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Setting>
              <Setting label="Daily steps">
                <OptionSelect
                  size="sm"
                  label="Daily steps"
                  options={stepOptions(block.dailySteps)}
                  value={block.dailySteps}
                  onChange={dailySteps => onChange({ ...block, dailySteps })}
                />
              </Setting>
            </div>
          </div>
        </>
      )}
      <CopyBlockDialog open={copying} onOpenChange={setCopying} programs={otherPrograms} journeys={journeys} onCopy={copySessions} />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={open => {
          if (!open) setPending(null);
        }}
        title={shownPending?.title ?? ''}
        description={shownPending?.description}
        confirmLabel={shownPending?.confirmLabel}
        tone="destructive"
        onConfirm={() => {
          if (pending) onChange(pending.block);
          setPending(null);
        }}
      />
    </header>
  );
}
