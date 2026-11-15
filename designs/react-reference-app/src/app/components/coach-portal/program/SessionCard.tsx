import { useId, type Ref } from 'react';
import { Eraser, PencilLine } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { coolDownEdits } from '../../../domain/coolDownEditing';
import { SLOTS, type Block, type Session } from '../../../domain/program';
import type { LibraryTarget } from '../../../domain/programEditing';
import type { RowContext } from '../../../domain/programSuggestions';
import { rowEdits } from '../../../domain/sessionEditing';
import { estimatedMinutes, isOverTarget } from '../../../domain/sessionTiming';
import { patternChoicesFor, slotPlanOrFallback, withMainPattern, withSecondaryPatterns } from '../../../domain/splitTemplates';
import { warmUpEdits } from '../../../domain/warmUpEditing';
import { describeLoss } from '../../../domain/weekEditing';
import { RowActionsMenu } from '../../RowActionsMenu';
import { cn } from '../../ui/utils';
import { sessionSummary } from '../../program-view/programView';
import { CoolDownCard } from './CoolDownCard';
import { useEditorAnnouncer } from './editorAnnouncer';
import { useResetConfirm } from './ResetConfirm';
import {
  CollapsedSessionHeader,
  EXPANDED_SESSION_CLASS,
  SESSION_ARTICLE_CLASS,
  SESSION_CONTENT_CLASS,
  SessionNameInput,
  sessionHeaderHeightStyle,
  useNameFocusOnExpand,
} from './sessionCardParts';
import { useMeasuredHeight } from './useMeasuredHeight';
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

function durationAgainstTarget(minutes: number, targetMinutes: number): string {
  return minutes === 0 ? `0 of ${targetMinutes} min` : `~${minutes} of ${targetMinutes} min`;
}

export function SessionCard({ session, block, expanded, articleRef, library, context, onExpand, onChange, onOpenLibrary }: SessionCardProps) {
  const headingId = useId();
  const { nameField, expand } = useNameFocusOnExpand(expanded, onExpand);
  const header = useMeasuredHeight();
  const confirm = useResetConfirm();
  const announce = useEditorAnnouncer();
  const edits = rowEdits(session, context);
  const exercisesById = new Map(library.map(exercise => [exercise.id, exercise]));
  const minutes = estimatedMinutes(session, exercisesById);
  const overTarget = isOverTarget(session, block, exercisesById);
  const slotTargets = SLOTS.map(slot => ({ slot, label: slotPlanOrFallback(block, session, slot).label }));

  function clear() {
    confirm.request({
      title: `Clear ${session.name}?`,
      confirmLabel: 'Clear session',
      lines: describeLoss(block, { kind: 'clear-session', sessionId: session.id }),
      apply: () => {
        onChange(edits.clear());
        announce(`${session.name} cleared`);
      },
    });
  }

  if (!expanded) {
    return (
      <article ref={articleRef} aria-labelledby={headingId} className={SESSION_ARTICLE_CLASS}>
        <CollapsedSessionHeader headingId={headingId} name={session.name} summary={sessionSummary(session, exercisesById)} onExpand={expand} />
      </article>
    );
  }

  return (
    <article ref={articleRef} aria-labelledby={headingId} className={cn(SESSION_ARTICLE_CLASS, EXPANDED_SESSION_CLASS)} style={sessionHeaderHeightStyle(header.height)}>
      <header ref={header.measureRef} className="sticky -top-4 z-[5] flex flex-wrap items-center gap-x-4 gap-y-1 rounded-t-card border-b border-border-subtle bg-card/95 px-3 py-2 backdrop-blur-sm lg:top-[calc(var(--block-header-height)-1.5rem)]">
        <h3 id={headingId} className="sr-only">
          {session.name}
        </h3>
        <SessionNameInput value={session.name} inputRef={nameField} onChange={name => onChange({ ...session, name })} />
        <p className={cn('flex gap-2 text-sm tabular-nums', { 'text-warning': overTarget, 'text-text-secondary': !overTarget })}>
          <span>{durationAgainstTarget(minutes, block.targetMinutes)}</span>
          {overTarget && <span>Over target</span>}
        </p>
        <RowActionsMenu
          label={`${session.name} actions`}
          size="xs"
          actions={[
            { name: 'rename', label: 'Rename', icon: PencilLine, onSelect: () => nameField.current?.select() },
            { name: 'clear', label: 'Clear session', icon: Eraser, tone: 'destructive', disabled: session.rows.length === 0, onSelect: clear },
          ]}
        />
      </header>
      <div className={cn('grid gap-5 p-3 sm:p-4', SESSION_CONTENT_CLASS)}>
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
            choices={patternChoicesFor(block, session, slot)}
            onPatternsChange={patterns =>
              onChange(slot === 'A' ? withMainPattern(block, session, patterns[0]) : withSecondaryPatterns(block, session, patterns))
            }
            library={library}
            edits={edits}
            slots={slotTargets}
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
