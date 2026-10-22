import { useId, useRef, type Ref } from 'react';
import { Eraser, PencilLine } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { SLOTS, type Block, type Session, type Slot } from '../../../domain/program';
import type { LibraryTarget } from '../../../domain/programEditing';
import { estimatedMinutes } from '../../../domain/programSuggestions';
import { sessionEdits, type SessionEditContext } from '../../../domain/sessionEditing';
import { slotPlanFor, type SlotPlan } from '../../../domain/splitTemplates';
import { describeReset } from '../../../domain/weekEditing';
import { RowActionsMenu } from '../../RowActionsMenu';
import { Input } from '../../ui/input';
import { cn } from '../../ui/utils';
import { CoolDownCard } from './CoolDownCard';
import { useResetConfirm } from './ResetConfirm';
import { SlotGroup } from './SlotGroup';
import { WarmUpCard } from './WarmUpCard';

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
  const confirm = useResetConfirm();
  const edits = sessionEdits(session, context);
  const minutes = estimatedMinutes(session);
  const overTarget = minutes > block.targetMinutes + OVER_TARGET_MINUTES;
  const articleClass = 'rounded-card border border-border bg-card shadow-card';

  function clear() {
    confirm.request({
      title: `Clear ${session.name}?`,
      confirmLabel: 'Clear session',
      lines: describeReset(block, { kind: 'remove-session', sessionId: session.id }),
      apply: () => onChange(edits.clear()),
    });
  }

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
        <RowActionsMenu
          label={`${session.name} actions`}
          actions={[
            { name: 'rename', label: 'Rename', icon: PencilLine, onSelect: () => nameField.current?.select() },
            { name: 'clear', label: 'Clear session', icon: Eraser, tone: 'destructive', disabled: session.rows.length === 0, onSelect: clear },
          ]}
        />
      </header>
      <div className="grid gap-5 p-3 sm:p-4">
        <WarmUpCard
          session={session}
          library={library}
          edits={edits}
          onChange={onChange}
          onPickExercise={() => onOpenLibrary({ kind: 'warm-up', sessionId: session.id })}
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
        <CoolDownCard
          session={session}
          library={library}
          edits={edits}
          onChange={onChange}
          onPickStretch={() => onOpenLibrary({ kind: 'cool-down', sessionId: session.id })}
        />
      </div>
      {confirm.dialog}
    </article>
  );
}
