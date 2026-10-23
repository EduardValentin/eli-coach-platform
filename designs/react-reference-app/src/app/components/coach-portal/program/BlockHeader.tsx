import { useEffect, useRef, useState, type Ref } from 'react';
import { ChevronDown, Copy, RotateCcw, Trash2 } from 'lucide-react';
import type { ClientJourney } from '../../../domain/journey';
import { BLOCK_TYPE_LABELS, type Block, type Program, type ProgramLanguage, type Session, type SplitShape, type TrainingDays } from '../../../domain/program';
import type { BlockStatus } from '../../../domain/programCalendar';
import { blockWithSessionsFrom, blockWithType } from '../../../domain/programEditing';
import { blockWithSplit, describeLoss, relayoutBlock } from '../../../domain/weekEditing';
import { formatJourneyDate } from '../../../utils/journeyLabels';
import { RowActionsMenu } from '../../RowActionsMenu';
import { WIDGET_TITLE_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { useIsDesktop } from '../../ui/use-desktop';
import { cn } from '../../ui/utils';
import { BlockNumber, blockProgress, BlockTypeSelect, STARTED_BLOCK_REASON } from './blockParts';
import { BlockSettings } from './BlockSettings';
import { CopyBlockDialog } from './CopyBlockDialog';
import { useResetConfirm } from './ResetConfirm';
import { useWeeksField } from './weeksField';

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

const REBUILD = 'Rebuild sessions';
const COLLAPSE_AFTER_PX = 80;

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

function useCollapsingSettings() {
  const scroll = useScrolledPast(COLLAPSE_AFTER_PX);
  const isDesktop = useIsDesktop();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const toggleButton = useRef<HTMLButtonElement>(null);
  const refocusToggle = useRef(false);
  const collapsible = isDesktop && scroll.past;

  useEffect(() => {
    if (!scroll.past) setSettingsOpen(false);
  }, [scroll.past]);

  useEffect(() => {
    if (!refocusToggle.current) return;
    refocusToggle.current = false;
    toggleButton.current?.focus();
  }, [settingsOpen]);

  function toggle() {
    refocusToggle.current = true;
    setSettingsOpen(open => !open);
  }

  return { headerRef: scroll.ref, collapsible, collapsed: collapsible && !settingsOpen, toggleButton, toggle };
}

function statusLine(block: Block, status: BlockStatus): string | null {
  const progress = blockProgress(block, status);
  if (progress) return progress.charAt(0).toUpperCase() + progress.slice(1);
  return status.kind === 'upcoming' && status.start ? `Starts ${formatJourneyDate(status.start)}` : null;
}

type SettingsToggleProps = { expanded: boolean; buttonRef: Ref<HTMLButtonElement>; onToggle: () => void };

function SettingsToggle({ expanded, buttonRef, onToggle }: SettingsToggleProps) {
  return (
    <Button ref={buttonRef} variant="ghost" size="icon-sm" aria-label="Block settings" aria-expanded={expanded} onClick={onToggle}>
      <ChevronDown aria-hidden="true" className={cn('transition-transform motion-reduce:transition-none', { 'rotate-180': expanded })} />
    </Button>
  );
}

type BarProps = { block: Block; index: number; status: BlockStatus };

function CollapsedBlockBar({ block, index, status, toggle }: BarProps & { toggle: SettingsToggleProps }) {
  const line = statusLine(block, status);
  return (
    <div className="flex items-center gap-3 py-2 pr-2 pl-4">
      <BlockNumber block={block} index={index} size="md" />
      <p className={cn(WIDGET_TITLE_CLASS, 'truncate')}>{`${BLOCK_TYPE_LABELS[block.type]} · ${block.weeks} wk`}</p>
      {line && <p className="truncate text-sm text-text-secondary">{line}</p>}
      <div className="ml-auto">
        <SettingsToggle {...toggle} />
      </div>
    </div>
  );
}

type BlockActions = { onCopy: () => void; onReset: () => void; onRemove: () => void };

function BlockTitleBar({ block, index, status, toggle, actions, onChangeType }: BarProps & { toggle: SettingsToggleProps | null; actions: BlockActions; onChangeType: (block: Block) => void }) {
  const line = statusLine(block, status);
  return (
    <div className="flex items-center gap-3 border-b border-border-subtle py-2.5 pr-2 pl-4">
      <BlockNumber block={block} index={index} size="md" />
      <BlockTypeSelect value={block.type} label="Block type" appearance="title" onChange={type => onChangeType(blockWithType(block, type))} />
      {line && <p className="truncate text-sm text-text-secondary">{line}</p>}
      <div className="ml-auto flex items-center gap-1">
        {toggle && <SettingsToggle {...toggle} />}
        <RowActionsMenu
          label="Block actions"
          parityRoot="BlockActionsMenu"
          actions={[
            { name: 'copy', label: 'Copy from another client…', icon: Copy, onSelect: actions.onCopy },
            { name: 'reset', label: 'Reset to split', icon: RotateCcw, onSelect: actions.onReset },
            {
              name: 'remove',
              label: 'Remove block',
              icon: Trash2,
              tone: 'destructive',
              disabledReason: status.kind === 'upcoming' ? undefined : STARTED_BLOCK_REASON,
              onSelect: actions.onRemove,
            },
          ]}
        />
      </div>
    </div>
  );
}

export function BlockHeader({ blocks, index, status, dayOne, today, language, otherPrograms, journeys, onChange, onRemove }: BlockHeaderProps) {
  const block = blocks[index];
  const [copying, setCopying] = useState(false);
  const confirm = useResetConfirm();
  const weeks = useWeeksField({ blocks, index, status, dayOne, today, onCommit: value => onChange({ ...block, weeks: value }) });
  const settings = useCollapsingSettings();

  function rebuild(title: string, next: Block, lines: string[]) {
    confirm.request({ title, confirmLabel: REBUILD, lines, apply: () => onChange(next) });
  }

  function copySessions(sessions: Session[]) {
    setCopying(false);
    const next = blockWithSessionsFrom(block, sessions);
    confirm.request({ title: "Replace this block's sessions?", confirmLabel: 'Replace sessions', lines: describeLoss(block, { kind: 'reset' }), apply: () => onChange(next) });
  }

  const changeShape = (shape: SplitShape) => rebuild('Change the split?', blockWithSplit(block, shape, language), describeLoss(block, { kind: 'split' }));
  const changeTrainingDays = (days: TrainingDays) =>
    rebuild('Change training days?', relayoutBlock(block, days), describeLoss(block, { kind: 'training-days', days }));
  const actions: BlockActions = {
    onCopy: () => setCopying(true),
    onReset: () => rebuild('Reset to the split?', blockWithSplit(block, block.split.shape, language), describeLoss(block, { kind: 'reset' })),
    onRemove: () =>
      confirm.request({ title: `Remove block ${index + 1}?`, confirmLabel: 'Remove block', lines: describeLoss(block, { kind: 'remove-block' }), apply: onRemove }),
  };
  const toggleControl = { buttonRef: settings.toggleButton, onToggle: settings.toggle };

  return (
    <header
      ref={settings.headerRef}
      className={cn('z-10 rounded-card border border-border bg-card shadow-card lg:sticky lg:-top-6', { 'lg:rounded-t-none lg:border-t-0': settings.collapsed })}
    >
      <h2 className="sr-only">{BLOCK_TYPE_LABELS[block.type]}</h2>
      {settings.collapsed ? (
        <CollapsedBlockBar block={block} index={index} status={status} toggle={{ ...toggleControl, expanded: false }} />
      ) : (
        <>
          <BlockTitleBar block={block} index={index} status={status} toggle={settings.collapsible ? { ...toggleControl, expanded: true } : null} actions={actions} onChangeType={onChange} />
          <BlockSettings block={block} weeks={weeks} onChange={onChange} onChangeShape={changeShape} onChangeTrainingDays={changeTrainingDays} />
        </>
      )}
      <CopyBlockDialog open={copying} onOpenChange={setCopying} programs={otherPrograms} journeys={journeys} onCopy={copySessions} />
      {confirm.dialog}
    </header>
  );
}
