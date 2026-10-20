import { useState } from 'react';
import type { Exercise } from '../../../context/TrainingContext';
import type { Equipment } from '../../../domain/exercises';
import type { ClientJourney } from '../../../domain/journey';
import type { RowTarget } from '../../../domain/programEditing';
import { BLOCK_TYPE_LABELS, type Block, type Program, type ProgramContent, type Session } from '../../../domain/program';
import { blockStatus } from '../../../domain/programCalendar';
import { WIDGET_TITLE_CLASS } from '../../typography';
import { Badge } from '../../ui/badge';
import { BlockSettingsStrip } from './BlockSettingsStrip';
import { BLOCK_BADGE_TONE } from './program-constants';
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
  onPickExercise: (target: RowTarget) => void;
};

export function BlockWorkspace({ block, blockIndex, content, program, dayOne, today, library, equipment, otherPrograms, journeys, onChange, onPickExercise }: BlockWorkspaceProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { blocks } = content.plan;
  const expandedId = block.sessions.some(session => session.id === expanded) ? expanded : block.sessions[0]?.id;
  const changeSession = (session: Session) =>
    onChange({ ...block, sessions: block.sessions.map(other => (other.id === session.id ? session : other)) });

  return (
    <section className="grid gap-6">
      <header className="flex flex-wrap items-center gap-3">
        <Badge tone={BLOCK_BADGE_TONE[block.type]}>{`Block ${blockIndex + 1}`}</Badge>
        <h2 className={WIDGET_TITLE_CLASS}>{BLOCK_TYPE_LABELS[block.type]}</h2>
      </header>
      <BlockSettingsStrip
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
      <p className="text-sm text-text-secondary">Cardio and texts arrive in the next task</p>
    </section>
  );
}
