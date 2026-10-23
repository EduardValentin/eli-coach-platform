import { useId, useRef, type Ref } from 'react';
import { Eraser, PencilLine } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { coolDownEdits } from '../../../domain/coolDownEditing';
import { SLOTS, type Block, type Session } from '../../../domain/program';
import type { LibraryTarget } from '../../../domain/programEditing';
import type { RowContext } from '../../../domain/programSuggestions';
import { rowEdits } from '../../../domain/sessionEditing';
import { estimatedMinutes, isOverTarget } from '../../../domain/sessionTiming';
import { slotPlanOrFallback } from '../../../domain/splitTemplates';
import { warmUpEdits } from '../../../domain/warmUpEditing';
import { describeLoss } from '../../../domain/weekEditing';
import { RowActionsMenu } from '../../RowActionsMenu';
import { cn } from '../../ui/utils';
import { sessionSummary } from '../../program-view/programView';
import { CoolDownCard } from './CoolDownCard';
import { useResetConfirm } from './ResetConfirm';
import { CollapsedSessionHeader, SESSION_ARTICLE_CLASS, SessionNameInput } from './sessionCardParts';
import { SlotGroup } from './SlotGroup';
import { WarmUpCard } from './WarmUpCard';

type SessionCardProps = {
  session: Session;
  block: Block;
  expanded: boolean;
  articleRef: Ref<HTMLElement>;
  library: readonly Exercise[];
  context: RowContext;
  onExpand: () => void;
  onChange: (session: Session) => void;
  onOpenLibrary: (target: LibraryTarget) => void;
};

export function SessionCard({ session, block, expanded, articleRef, library, context, onExpand, onChange, onOpenLibrary }: SessionCardProps) {
  const headingId = useId();
  const nameField = useRef<HTMLInputElement>(null);
  const confirm = useResetConfirm();
  const edits = rowEdits(session, context);
  const minutes = estimatedMinutes(session);
  const overTarget = isOverTarget(session, block);

  function clear() {
    confirm.request({
      title: `Clear ${session.name}?`,
      confirmLabel: 'Clear session',
      lines: describeLoss(block, { kind: 'clear-session', sessionId: session.id }),
      apply: () => onChange(edits.clear()),
    });
  }

  if (!expanded) {
    return (
      <article ref={articleRef} aria-labelledby={headingId} className={SESSION_ARTICLE_CLASS}>
        <CollapsedSessionHeader headingId={headingId} name={session.name} summary={sessionSummary(session)} onExpand={onExpand} />
      </article>
    );
  }

  return (
    <article ref={articleRef} aria-labelledby={headingId} className={cn(SESSION_ARTICLE_CLASS, 'scroll-mt-4 lg:scroll-mt-(--block-header-height)')}>
      <header className="sticky -top-4 z-[5] flex flex-wrap items-center gap-x-4 gap-y-1 rounded-t-card border-b border-border-subtle bg-card/95 px-3 py-2 backdrop-blur-sm lg:top-[calc(var(--block-header-height)-1.5rem)]">
        <h3 id={headingId} className="sr-only">
          {session.name}
        </h3>
        <SessionNameInput value={session.name} inputRef={nameField} onChange={name => onChange({ ...session, name })} />
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
          edits={warmUpEdits(session, library)}
          onChange={onChange}
          onPickExercise={() => onOpenLibrary({ kind: 'warm-up', sessionId: session.id })}
        />
        {SLOTS.map(slot => (
          <SlotGroup
            key={slot}
            session={session}
            plan={slotPlanOrFallback(block, session, slot)}
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
          edits={coolDownEdits(session)}
          onChange={onChange}
          onPickStretch={() => onOpenLibrary({ kind: 'cool-down', sessionId: session.id })}
        />
      </div>
      {confirm.dialog}
    </article>
  );
}
