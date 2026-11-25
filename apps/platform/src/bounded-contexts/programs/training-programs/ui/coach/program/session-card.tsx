import { Eraser, PencilLine } from "lucide-react";
import { useId, useMemo, useRef, type Ref } from "react";

import { cn } from "~/shared/design-system/lib";
import { RowActionsMenu } from "~/shared/design-system/primitives";

import {
  BlockLoss,
  CoolDownEditing,
  ProgramProgression,
  SessionEditing,
  SessionTiming,
  SLOTS,
  SplitTemplate,
  WarmUpEditing,
  type Block,
  type ClientLevel,
  type Equipment,
  type LibraryExercise,
  type LibraryTarget,
  type Session,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";
import { counted } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/program-view";

import { newBuilderId } from "./builder-editing";
import { CoolDownCard } from "./cool-down-card";
import { useDestructiveConfirm } from "./destructive-confirm";
import { useEditorAnnouncer } from "./editor-announcer";
import {
  CollapsedSessionHeader,
  EXPANDED_SESSION_CLASS,
  SESSION_ARTICLE_CLASS,
  SESSION_CONTENT_CLASS,
  SessionNameInput,
  sessionHeaderHeightStyle,
} from "./session-card-parts";
import { SlotGroup } from "./slot-group";
import { useMeasuredHeight } from "./use-measured-height";
import { usePendingFocus } from "./use-pending-focus";
import { WarmUpCard } from "./warm-up-card";

type SessionCardProps = {
  session: Session;
  block: Block;
  level: ClientLevel;
  expanded: boolean;
  articleRef: Ref<HTMLElement>;
  libraryExercises: readonly LibraryExercise[];
  libraryEquipment: readonly Equipment[];
  onExpand: () => void;
  onChange: (session: Session) => void;
  onOpenLibrary: (target: LibraryTarget) => void;
};

function durationAgainstTarget(minutes: number, targetMinutes: number): string {
  return minutes === 0
    ? `0 of ${targetMinutes} min`
    : `~${minutes} of ${targetMinutes} min`;
}

function sessionSummary(session: Session, minutes: number): string {
  const exercises = counted(session.rows.length, "exercise");

  return minutes === 0
    ? exercises
    : `${exercises} · ${SessionTiming.estimatedDuration(minutes)}`;
}

export function SessionCard({
  session,
  block,
  level,
  expanded,
  articleRef,
  libraryExercises,
  libraryEquipment,
  onExpand,
  onChange,
  onOpenLibrary,
}: SessionCardProps) {
  const headingId = useId();
  const nameField = useRef<HTMLInputElement>(null);
  const focusLater = usePendingFocus();
  const expand = () => {
    focusLater(() => nameField.current);
    onExpand();
  };
  const header = useMeasuredHeight();
  const confirm = useDestructiveConfirm();
  const announce = useEditorAnnouncer();
  const exercisesById = useMemo(
    () => new Map(libraryExercises.map((exercise) => [exercise.id, exercise])),
    [libraryExercises],
  );
  const timing = { block, level, exercisesById };
  const minutes = SessionTiming.longestWeekMinutes(session, timing);
  const overTarget = SessionTiming.isOverTarget(session, timing);
  const editing = new SessionEditing({
    newId: newBuilderId,
    blockType: block.type,
    libraryExercises,
    libraryEquipment,
  });

  function clear() {
    confirm.request({
      title: `Clear ${session.name}?`,
      confirmLabel: "Clear session",
      lines: BlockLoss.describe(block, {
        kind: "clear-session",
        sessionId: session.id,
      }),
      apply: () => {
        onChange(editing.clear(session));
        announce(`${session.name} cleared`);
      },
    });
  }

  if (!expanded) {
    return (
      <article
        data-parity-root="SessionCard"
        aria-labelledby={headingId}
        className={SESSION_ARTICLE_CLASS}
        ref={articleRef}
      >
        <CollapsedSessionHeader
          headingId={headingId}
          name={session.name}
          onExpand={expand}
          summary={sessionSummary(session, minutes)}
        />
      </article>
    );
  }

  const firstWeek = ProgramProgression.sessionAtWeek(session, 1, timing);
  const plans = SLOTS.map((slot) =>
    SplitTemplate.slotPlanOrFallback(block, session, slot),
  );
  const slots = plans.map(({ slot, label }) => ({ slot, label }));

  return (
    <article
      data-parity-root="SessionCard"
      aria-labelledby={headingId}
      className={cn(SESSION_ARTICLE_CLASS, EXPANDED_SESSION_CLASS)}
      ref={articleRef}
      style={sessionHeaderHeightStyle(header.height)}
    >
      <header
        className="sticky -top-4 z-[5] flex flex-wrap items-center gap-x-4 gap-y-1 rounded-t-card border-b border-border-subtle bg-surface-base px-3 py-2 lg:top-[calc(var(--block-header-height)-1.5rem)]"
        ref={header.measureRef}
      >
        <h3 className="sr-only" id={headingId}>
          {session.name}
        </h3>
        <SessionNameInput
          inputRef={nameField}
          onChange={(name) => onChange({ ...session, name })}
          value={session.name}
        />
        <p
          className={cn("flex gap-2 text-sm tabular-nums", {
            "text-feedback-warning": overTarget,
            "text-text-secondary": !overTarget,
          })}
        >
          <span>{durationAgainstTarget(minutes, block.targetMinutes)}</span>
          {overTarget && <span>Over target</span>}
        </p>
        <RowActionsMenu
          actions={[
            {
              name: "rename",
              label: "Rename",
              icon: PencilLine,
              onSelect: () => nameField.current?.select(),
            },
            {
              name: "clear",
              label: "Clear session",
              icon: Eraser,
              tone: "destructive",
              disabled: session.rows.length === 0,
              onSelect: clear,
            },
          ]}
          label={`${session.name} actions`}
          size="xs"
        />
      </header>
      <div
        className={cn(
          "grid grid-cols-[minmax(0,1fr)] gap-5 p-3 sm:p-4",
          SESSION_CONTENT_CLASS,
        )}
      >
        <WarmUpCard
          editing={new WarmUpEditing({ newId: newBuilderId, libraryExercises })}
          libraryExercises={libraryExercises}
          onChange={onChange}
          onPickExercise={() =>
            onOpenLibrary({ kind: "warm-up", sessionId: session.id })
          }
          session={session}
        />
        {plans.map((plan) => (
          <SlotGroup
            editing={editing}
            firstWeek={firstWeek}
            key={plan.slot}
            libraryExercises={libraryExercises}
            onAdd={(slot) =>
              onOpenLibrary({ kind: "slot", sessionId: session.id, slot })
            }
            onAddSubstitution={(rowId) =>
              onOpenLibrary({
                kind: "substitution",
                sessionId: session.id,
                rowId,
              })
            }
            onChange={onChange}
            plan={plan}
            session={session}
            slots={slots}
          />
        ))}
        <CoolDownCard
          editing={new CoolDownEditing({ newId: newBuilderId })}
          libraryExercises={libraryExercises}
          onChange={onChange}
          onPickStretch={() =>
            onOpenLibrary({ kind: "cool-down", sessionId: session.id })
          }
          session={session}
        />
      </div>
      {confirm.dialog}
    </article>
  );
}
