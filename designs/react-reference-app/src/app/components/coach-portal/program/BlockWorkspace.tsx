import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Exercise } from '../../../context/TrainingContext';
import type { Equipment } from '../../../domain/exercises';
import type { ClientJourney } from '../../../domain/journey';
import type { Block, Program, ProgramLanguage } from '../../../domain/program';
import { blockStatus } from '../../../domain/programCalendar';
import { blockWithSession, type LibraryTarget } from '../../../domain/programEditing';
import { blockWithCardio, plannedSessions } from '../../../domain/weekEditing';
import { BlockHeader } from './BlockHeader';
import { CardioSessionCard } from './CardioSessionCard';
import { LibraryTargetContext } from './libraryTarget';
import { SessionCard } from './SessionCard';
import { SessionDragLayer } from './sessionDnd';
import { useMeasuredHeight } from './useMeasuredHeight';
import { WeekDays } from './WeekDays';

type BlockWorkspaceProps = {
  block: Block;
  blockIndex: number;
  blocks: Block[];
  language: ProgramLanguage;
  dayOne: Date | null;
  today: Date;
  library: readonly Exercise[];
  equipment: readonly Equipment[];
  otherPrograms: Program[];
  journeys: Record<string, ClientJourney>;
  openSessionId: string | undefined;
  onOpenSession: (sessionId: string) => void;
  onChange: (block: Block) => void;
  onRemove: () => void;
  onOpenLibrary: (target: LibraryTarget) => void;
  libraryTarget: LibraryTarget | null;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function BlockWorkspace(props: BlockWorkspaceProps) {
  const { block, blockIndex, blocks, language, dayOne, today, library, equipment, otherPrograms, journeys, openSessionId, onOpenSession, onChange, onRemove, onOpenLibrary, libraryTarget } = props;
  const header = useMeasuredHeight();
  const articles = useRef(new Map<string, HTMLElement>());
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const planned = plannedSessions(block);
  const context = { blockType: block.type, library, equipment };

  useEffect(() => {
    if (!scrollTarget) return;
    articles.current.get(scrollTarget)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    setScrollTarget(null);
  }, [scrollTarget]);

  function openFromWeek(sessionId: string) {
    onOpenSession(sessionId);
    setScrollTarget(sessionId);
  }

  function articleRefFor(sessionId: string) {
    return (element: HTMLElement | null) => {
      if (element) articles.current.set(sessionId, element);
      else articles.current.delete(sessionId);
    };
  }

  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-6" style={{ '--block-header-height': `${header.height}px` } as CSSProperties}>
      <BlockHeader
        key={block.id}
        blocks={blocks}
        index={blockIndex}
        status={blockStatus({ blocks, dayOne, today }, blockIndex)}
        dayOne={dayOne}
        today={today}
        language={language}
        otherPrograms={otherPrograms}
        journeys={journeys}
        onChange={onChange}
        onRemove={onRemove}
        measureRef={header.measureRef}
      />
      <WeekDays block={block} library={library} onChange={onChange} onOpenSession={openFromWeek} />
      <LibraryTargetContext.Provider value={libraryTarget}>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          {planned.map(entry =>
            entry.kind === 'cardio' ? (
              <CardioSessionCard
                key={entry.cardio.id}
                cardio={entry.cardio}
                expanded={entry.cardio.id === openSessionId}
                articleRef={articleRefFor(entry.cardio.id)}
                library={library}
                onExpand={() => onOpenSession(entry.cardio.id)}
                onChange={next => onChange(blockWithCardio(block, next))}
                onOpenLibrary={onOpenLibrary}
              />
            ) : (
              <SessionCard
                key={entry.session.id}
                session={entry.session}
                block={block}
                expanded={entry.session.id === openSessionId}
                articleRef={articleRefFor(entry.session.id)}
                library={library}
                context={context}
                onExpand={() => onOpenSession(entry.session.id)}
                onChange={next => onChange(blockWithSession(block, next))}
                onOpenLibrary={onOpenLibrary}
              />
            ),
          )}
        </div>
      </LibraryTargetContext.Provider>
      <SessionDragLayer />
    </section>
  );
}
