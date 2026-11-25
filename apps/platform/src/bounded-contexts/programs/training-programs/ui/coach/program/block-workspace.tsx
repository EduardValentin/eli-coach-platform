import { useEffect, useRef, useState, type CSSProperties } from "react";

import { useClientReducedMotionPreference } from "~/shared/design-system/motion";

import {
  BlockEditing,
  type Block,
  type ClientLevel,
  type Equipment,
  type LibraryExercise,
  type LibraryTarget,
  type ProgramLanguage,
  type Session,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { BlockHeader } from "./block-header";
import { LibraryTargetContext } from "./library-target";
import { CollapsedSessionCard, OpenSessionCard } from "./session-card";
import { SessionDragLayer } from "./session-dnd";
import { useMeasuredHeight } from "./use-measured-height";
import { usePendingFocus } from "./use-pending-focus";
import { WeekDays } from "./week-days";

export function openSessionIdOf(
  block: Block,
  chosen: string | undefined,
): string | undefined {
  const listed = BlockEditing.listedSessions(block);

  return (listed.find((session) => session.id === chosen) ?? listed[0])?.id;
}

function blockWithSession(block: Block, session: Session): Block {
  return {
    ...block,
    sessions: block.sessions.map((other) =>
      other.id === session.id ? session : other,
    ),
  };
}

type BlockWorkspaceProps = {
  block: Block;
  blockIndex: number;
  blocks: Block[];
  language: ProgramLanguage;
  level: ClientLevel;
  libraryEquipment: readonly Equipment[];
  libraryExercises: readonly LibraryExercise[];
  libraryTarget: LibraryTarget | null;
  openSessionId: string | undefined;
  onChange: (block: Block) => void;
  onOpenLibrary: (target: LibraryTarget) => void;
  onOpenSession: (sessionId: string) => void;
  onRemove: () => void;
};

export function BlockWorkspace({
  block,
  blockIndex,
  blocks,
  language,
  level,
  libraryEquipment,
  libraryExercises,
  libraryTarget,
  openSessionId,
  onChange,
  onOpenLibrary,
  onOpenSession,
  onRemove,
}: BlockWorkspaceProps) {
  const header = useMeasuredHeight();
  const reducedMotion = useClientReducedMotionPreference();
  const articles = useRef(new Map<string, HTMLElement>());
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const focusLater = usePendingFocus();

  useEffect(() => {
    if (!scrollTarget) return;
    articles.current.get(scrollTarget)?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
    setScrollTarget(null);
  }, [scrollTarget, reducedMotion]);

  function openFromWeek(sessionId: string) {
    onOpenSession(sessionId);
    setScrollTarget(sessionId);
  }

  function expandFromCard(sessionId: string) {
    focusLater(() =>
      articles.current
        .get(sessionId)
        ?.querySelector<HTMLElement>('[aria-label="Session name"]'),
    );
    onOpenSession(sessionId);
  }

  function articleRefFor(sessionId: string) {
    return (element: HTMLElement | null) => {
      if (element) articles.current.set(sessionId, element);
      else articles.current.delete(sessionId);
    };
  }

  return (
    <section
      className="grid grid-cols-[minmax(0,1fr)] gap-6"
      data-parity-root="BlockWorkspace"
      style={{ "--block-header-height": `${header.height}px` } as CSSProperties}
    >
      <BlockHeader
        blocks={blocks}
        index={blockIndex}
        key={block.id}
        language={language}
        level={level}
        libraryExercises={libraryExercises}
        measureRef={header.measureRef}
        onChange={onChange}
        onRemove={onRemove}
      />
      <WeekDays
        block={block}
        level={level}
        libraryExercises={libraryExercises}
        onChange={onChange}
        onOpenSession={openFromWeek}
      />
      <LibraryTargetContext.Provider value={libraryTarget}>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          {BlockEditing.listedSessions(block).map((session) =>
            session.id === openSessionId ? (
              <OpenSessionCard
                articleRef={articleRefFor(session.id)}
                block={block}
                key={session.id}
                level={level}
                libraryEquipment={libraryEquipment}
                libraryExercises={libraryExercises}
                onChange={(next) => onChange(blockWithSession(block, next))}
                onOpenLibrary={onOpenLibrary}
                session={session}
              />
            ) : (
              <CollapsedSessionCard
                articleRef={articleRefFor(session.id)}
                block={block}
                key={session.id}
                level={level}
                libraryExercises={libraryExercises}
                onExpand={() => expandFromCard(session.id)}
                session={session}
              />
            ),
          )}
        </div>
      </LibraryTargetContext.Provider>
      <SessionDragLayer />
    </section>
  );
}
