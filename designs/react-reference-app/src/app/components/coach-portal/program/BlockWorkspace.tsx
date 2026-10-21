import { useState } from 'react';
import type { Exercise } from '../../../context/TrainingContext';
import type { Equipment } from '../../../domain/exercises';
import type { ClientJourney } from '../../../domain/journey';
import type { RowTarget } from '../../../domain/programEditing';
import type { Block, Program, ProgramContent, Session } from '../../../domain/program';
import { blockStatus } from '../../../domain/programCalendar';
import { BlockHeader } from './BlockHeader';
import { BlockTexts } from './BlockTexts';
import { CardioEditor } from './CardioEditor';
import { SessionCard } from './SessionCard';
import { WeekCalendarEditor } from './WeekCalendarEditor';

export type { RowTarget };

type BlockWorkspaceProps = {
  block: Block;
  blockIndex: number;
  content: ProgramContent;
  program: Program;
  dayOne: Date | null;
  today: Date;
  library: readonly Exercise[];
  equipment: readonly Equipment[];
  otherPrograms: Program[];
  journeys: Record<string, ClientJourney>;
  onChange: (block: Block) => void;
  onRemove: () => void;
  onPickExercise: (target: RowTarget) => void;
};

export function BlockWorkspace({ block, blockIndex, content, program, dayOne, today, library, equipment, otherPrograms, journeys, onChange, onRemove, onPickExercise }: BlockWorkspaceProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { blocks } = content.plan;
  const expandedId = block.sessions.some(session => session.id === expanded) ? expanded : block.sessions[0]?.id;
  const changeSession = (session: Session) =>
    onChange({ ...block, sessions: block.sessions.map(other => (other.id === session.id ? session : other)) });

  return (
    <section className="grid gap-6">
      <BlockHeader
        key={block.id}
        blocks={blocks}
        index={blockIndex}
        status={blockStatus(blocks, blockIndex, dayOne, today)}
        dayOne={dayOne}
        today={today}
        language={program.language}
        otherPrograms={otherPrograms}
        journeys={journeys}
        onChange={onChange}
        onRemove={onRemove}
      />
      <WeekCalendarEditor block={block} onChange={onChange} />
      <ul aria-label="Sessions" className="grid gap-3">
        {block.sessions.map(session => (
          <li key={session.id}>
            <SessionCard
              session={session}
              block={block}
              expanded={session.id === expandedId}
              onToggle={() => setExpanded(session.id)}
              library={library}
              equipment={equipment}
              onChange={changeSession}
              onPickExercise={onPickExercise}
            />
          </li>
        ))}
      </ul>
      <CardioEditor block={block} onChange={onChange} />
      <BlockTexts block={block} language={program.language} onChange={onChange} />
    </section>
  );
}
