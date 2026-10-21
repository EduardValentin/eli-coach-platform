import { useId, useRef, useState, type Ref } from 'react';
import { Eraser, PencilLine, Plus, X } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { SLOTS, type Block, type Session, type Slot } from '../../../domain/program';
import type { LibraryTarget } from '../../../domain/programEditing';
import { estimatedMinutes } from '../../../domain/programSuggestions';
import { sessionEdits, type SessionEditContext } from '../../../domain/sessionEditing';
import { slotPlanFor, type SlotPlan } from '../../../domain/splitTemplates';
import { RowActionsMenu } from '../../RowActionsMenu';
import { LABEL_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { ConfirmDialog } from '../../ui/confirm-dialog';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';
import { Textarea } from '../../ui/textarea';
import { cn } from '../../ui/utils';
import { DropZone, LIBRARY_EXERCISE, type DraggedItem } from './sessionDnd';
import { SlotGroup } from './SlotGroup';

type SessionCardProps = {
  session: Session;
  block: Block;
  expanded: boolean;
  articleRef: Ref<HTMLElement>;
  library: readonly Exercise[];
  context: SessionEditContext;
  onExpand: () => void;
  onChange: (session: Session) => void;
  onOpenLibrary: (target: LibraryTarget) => void;
};

const OVER_TARGET_MINUTES = 10;
const FALLBACK_PLANS: Record<Slot, SlotPlan> = {
  A: { slot: 'A', patterns: [], label: 'Main lift' },
  B: { slot: 'B', patterns: [], label: 'Secondary' },
  C: { slot: 'C', patterns: ['isolation'], label: 'Accessories' },
  D: { slot: 'D', patterns: ['core'], label: 'Core / finisher' },
};

function acceptsMobility(dragged: DraggedItem): boolean {
  return dragged.kind === LIBRARY_EXERCISE && dragged.item.exercise.type === 'mobility';
}

type WarmUpCardProps = {
  session: Session;
  library: readonly Exercise[];
  onChange: (session: Session) => void;
  onPickMobility: () => void;
  onAddMobility: (exerciseId: string) => void;
  onRemoveMobility: (exerciseId: string) => void;
};

function WarmUpCard({ session, library, onChange, onPickMobility, onAddMobility, onRemoveMobility }: WarmUpCardProps) {
  const noteId = useId();
  const mobility = session.warmUp.mobilityExerciseIds.map(id => ({ id, name: library.find(item => item.id === id)?.name ?? 'Unknown exercise' }));
  return (
    <DropZone
      rules={{ sessionId: session.id, onDrop: dragged => dragged.kind === LIBRARY_EXERCISE && onAddMobility(dragged.item.exercise.id) }}
      accepts={acceptsMobility}
      className="rounded-control border border-border-subtle bg-surface-subtle p-3"
      activeClassName="ring-2 ring-primary/40"
    >
      <fieldset className="grid gap-2">
        <legend className={cn(LABEL_CLASS, 'mb-2')}>Warm-up</legend>
        <label htmlFor={noteId} className="sr-only">
          Warm-up note
        </label>
        <Textarea
          id={noteId}
          rows={2}
          placeholder="3–5 min easy cardio, then…"
          value={session.warmUp.warmUpSetsNote}
          onChange={event => onChange({ ...session, warmUp: { ...session.warmUp, warmUpSetsNote: event.target.value } })}
          className="min-h-0 bg-surface-base"
        />
        <div className="flex flex-wrap items-center gap-2">
          {mobility.length > 0 && (
            <ul aria-label="Mobility exercises" className="flex flex-wrap gap-2">
              {mobility.map(item => (
                <li key={item.id} className="flex items-center gap-1 rounded-full border border-border bg-surface-base py-0.5 pr-0.5 pl-3 text-sm text-text-primary">
                  {item.name}
                  <Button variant="ghost" size="icon-xs" aria-label={`Remove ${item.name}`} onClick={() => onRemoveMobility(item.id)}>
                    <X aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="ghost" size="xs" onClick={onPickMobility}>
            <Plus aria-hidden="true" />
            Add mobility exercise
          </Button>
        </div>
      </fieldset>
    </DropZone>
  );
}

function CollapsedSession({ session, headingId, onExpand }: { session: Session; headingId: string; onExpand: () => void }) {
  const count = session.rows.length;
  return (
    <h3>
      <button
        type="button"
        aria-expanded={false}
        onClick={onExpand}
        className="flex w-full flex-wrap items-baseline justify-between gap-2 rounded-card px-4 py-3 text-left outline-none hover:bg-surface-quiet focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span id={headingId} className="font-serif text-lg text-text-primary">
          {session.name}
        </span>
        <span className="text-sm text-text-secondary tabular-nums">{`${count} ${count === 1 ? 'exercise' : 'exercises'} · ~${estimatedMinutes(session)} min`}</span>
      </button>
    </h3>
  );
}

export function SessionCard({ session, block, expanded, articleRef, library, context, onExpand, onChange, onOpenLibrary }: SessionCardProps) {
  const headingId = useId();
  const nameField = useRef<HTMLInputElement>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const edits = sessionEdits(session, context);
  const minutes = estimatedMinutes(session);
  const overTarget = minutes > block.targetMinutes + OVER_TARGET_MINUTES;
  const articleClass = 'rounded-card border border-border bg-card shadow-card';

  if (!expanded) {
    return (
      <article ref={articleRef} aria-labelledby={headingId} className={articleClass}>
        <CollapsedSession session={session} headingId={headingId} onExpand={onExpand} />
      </article>
    );
  }

  return (
    <article ref={articleRef} aria-labelledby={headingId} className={cn(articleClass, 'scroll-mt-4 lg:scroll-mt-(--block-header-height)')}>
      <header className="sticky -top-4 z-[5] flex flex-wrap items-center gap-x-4 gap-y-1 rounded-t-card border-b border-border-subtle bg-card/95 px-3 py-2 backdrop-blur-sm lg:top-[calc(var(--block-header-height)-1.5rem)]">
        <h3 id={headingId} className="sr-only">
          {session.name}
        </h3>
        <Input
          ref={nameField}
          aria-label="Session name"
          value={session.name}
          onChange={event => onChange({ ...session, name: event.target.value })}
          className="h-auto w-auto min-w-0 flex-1 basis-40 border-transparent bg-transparent px-1 font-serif text-xl text-text-primary shadow-none hover:border-control-border-soft md:text-xl"
        />
        <p className={cn('flex gap-2 text-sm tabular-nums', { 'text-warning': overTarget, 'text-text-secondary': !overTarget })}>
          <span>{`~${minutes} min · target ${block.targetMinutes}`}</span>
          {overTarget && <span>Over target</span>}
        </p>
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <Switch checked={session.coolDown} onCheckedChange={coolDown => onChange({ ...session, coolDown })} />
          Cool-down
        </label>
        <RowActionsMenu
          label={`${session.name} actions`}
          actions={[
            { name: 'rename', label: 'Rename', icon: PencilLine, onSelect: () => nameField.current?.select() },
            { name: 'clear', label: 'Clear session', icon: Eraser, tone: 'destructive', disabled: session.rows.length === 0, onSelect: () => setConfirmingClear(true) },
          ]}
        />
      </header>
      <div className="grid gap-5 p-3 sm:p-4">
        <WarmUpCard
          session={session}
          library={library}
          onChange={onChange}
          onPickMobility={() => onOpenLibrary({ kind: 'mobility', sessionId: session.id })}
          onAddMobility={exerciseId => onChange(edits.addMobility(exerciseId))}
          onRemoveMobility={exerciseId => onChange(edits.removeMobility(exerciseId))}
        />
        {SLOTS.map(slot => (
          <SlotGroup
            key={slot}
            session={session}
            plan={slotPlanFor(block, session, slot) ?? FALLBACK_PLANS[slot]}
            library={library}
            edits={edits}
            onChange={onChange}
            onAdd={target => onOpenLibrary({ kind: 'slot', sessionId: session.id, slot: target })}
            onAddSubstitution={rowId => onOpenLibrary({ kind: 'substitution', sessionId: session.id, rowId })}
          />
        ))}
      </div>
      <ConfirmDialog
        open={confirmingClear}
        onOpenChange={setConfirmingClear}
        title={`Clear ${session.name}?`}
        description="Every exercise of this session is removed. The warm-up stays."
        confirmLabel="Clear session"
        cancelLabel="Keep exercises"
        tone="destructive"
        onConfirm={() => {
          setConfirmingClear(false);
          onChange(edits.clear());
        }}
      />
    </article>
  );
}
