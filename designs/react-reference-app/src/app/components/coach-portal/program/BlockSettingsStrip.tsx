import { useState, type ReactNode } from 'react';
import { Copy } from 'lucide-react';
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
import { TARGET_MINUTES } from '../../../domain/programDefaults';
import { blockWithSessionsFrom } from '../../../domain/programEditing';
import { emptySessionsFor, spreadCalendar } from '../../../domain/programSuggestions';
import { fillTemplate, templateText } from '../../../domain/programTemplates';
import { Button } from '../../ui/button';
import { InlineProblem } from '../../InlineProblem';
import { LABEL_CLASS } from '../../typography';
import { ConfirmDialog } from '../../ui/confirm-dialog';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Switch } from '../../ui/switch';
import { CopyBlockDialog } from './CopyBlockDialog';
import { SPLIT_SHAPE_LABELS } from './program-constants';
import { blockWithType, useWeeksField } from './weeksField';

type BlockSettingsStripProps = {
  blocks: Block[];
  index: number;
  status: BlockStatus;
  dayOne: Date | null;
  today: Date;
  language: ProgramLanguage;
  otherPrograms: Program[];
  journeys: Record<string, ClientJourney>;
  onChange: (block: Block) => void;
};

const SPLIT_SHAPES = Object.keys(SPLIT_SHAPE_LABELS) as SplitShape[];

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

function reshaped(block: Block, shape: SplitShape, language: ProgramLanguage): Block {
  const days = Object.values(block.calendar).filter(entry => entry.kind === 'session').length;
  const sessions = emptySessionsFor(shape, days);
  return {
    ...block,
    split: { ...block.split, shape, text: fillTemplate(templateText(`split.${shape}`, language).text, { days }) },
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

export function BlockSettingsStrip({ blocks, index, status, dayOne, today, language, otherPrograms, journeys, onChange }: BlockSettingsStripProps) {
  const block = blocks[index];
  const [pendingShape, setPendingShape] = useState<SplitShape | null>(null);
  const [copying, setCopying] = useState(false);
  const [pendingCopy, setPendingCopy] = useState<Session[] | null>(null);
  const weeks = useWeeksField({ blocks, index, status, dayOne, today, onCommit: value => onChange({ ...block, weeks: value }) });

  function copySessions(sessions: Session[]) {
    setCopying(false);
    if (hasExercises(block)) setPendingCopy(sessions);
    else onChange(blockWithSessionsFrom(block, sessions));
  }

  function changeShape(shape: SplitShape) {
    if (hasExercises(block)) setPendingShape(shape);
    else onChange(reshaped(block, shape, language));
  }

  return (
    <div className="grid grid-cols-2 gap-4 rounded-field border border-border bg-surface-base p-4 sm:grid-cols-3 lg:grid-cols-6">
      <Setting label="Type">
        <Select value={block.type} onValueChange={value => onChange(blockWithType(block, value as BlockType))}>
          <SelectTrigger size="sm" aria-label="Block type">
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
      </Setting>
      <Setting label="Weeks">
        <Input size="sm" aria-label="Weeks" {...weeks.inputProps} />
        {weeks.problem && <InlineProblem id={weeks.problemId}>{weeks.problem}</InlineProblem>}
      </Setting>
      {block.type !== 'deload' && (
        <Setting label="Calibration">
          <label className="flex min-h-(--size-control-sm) items-center gap-2 text-sm text-text-primary">
            <Switch checked={block.calibrationWeek} onCheckedChange={checked => onChange({ ...block, calibrationWeek: checked })} />
            Week 1 = calibration
          </label>
        </Setting>
      )}
      <Setting label="Split shape">
        <Select value={block.split.shape} onValueChange={value => changeShape(value as SplitShape)}>
          <SelectTrigger size="sm" aria-label="Split shape">
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
          aria-label="Split name"
          placeholder={SPLIT_SHAPE_LABELS[block.split.shape]}
          value={block.split.name}
          onChange={event => onChange({ ...block, split: { ...block.split, name: event.target.value } })}
        />
      </Setting>
      <Setting label="Target">
        <Select value={String(block.targetMinutes)} onValueChange={value => onChange({ ...block, targetMinutes: Number(value) })}>
          <SelectTrigger size="sm" aria-label="Target minutes">
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
      <Setting label="Sessions">
        <Button variant="outline" size="sm" onClick={() => setCopying(true)}>
          <Copy aria-hidden="true" />
          Copy from another client
        </Button>
      </Setting>
      <CopyBlockDialog open={copying} onOpenChange={setCopying} programs={otherPrograms} journeys={journeys} onCopy={copySessions} />
      <ConfirmDialog
        open={pendingCopy !== null}
        onOpenChange={open => {
          if (!open) setPendingCopy(null);
        }}
        title="Replace this block's sessions?"
        description="The sessions of the chosen block replace every session of this block."
        confirmLabel="Replace sessions"
        tone="destructive"
        onConfirm={() => {
          if (pendingCopy) onChange(blockWithSessionsFrom(block, pendingCopy));
          setPendingCopy(null);
        }}
      />
      <ConfirmDialog
        open={pendingShape !== null}
        onOpenChange={open => {
          if (!open) setPendingShape(null);
        }}
        title="Replace the sessions?"
        description={pendingShape && `Every session of this block is rebuilt from the ${SPLIT_SHAPE_LABELS[pendingShape]} shape.`}
        confirmLabel="Replace sessions"
        tone="destructive"
        onConfirm={() => {
          if (pendingShape) onChange(reshaped(block, pendingShape, language));
          setPendingShape(null);
        }}
      />
    </div>
  );
}
