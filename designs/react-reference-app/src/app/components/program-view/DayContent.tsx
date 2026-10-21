import { cardioMinutes, hasIntervals } from '../../domain/programCardio';
import { templateText } from '../../domain/programTemplates';
import type { Block, Weekday } from '../../domain/program';
import { SessionTable } from './SessionTable';
import { dayPanelId, dayTabId } from './WeekStrip';
import { cardioFor, cardioSegmentText, sessionFor, type ProgramView } from './programView';

type DayContentProps = { view: ProgramView; block: Block; weekday: Weekday };

export function DayContent({ view, block, weekday }: DayContentProps) {
  const { language } = view.program;
  const session = sessionFor(block, weekday);
  const cardio = cardioFor(block, weekday);
  const lowEnergy = templateText('lowEnergy', language).text;

  return (
    <div role="tabpanel" id={dayPanelId(weekday)} aria-labelledby={dayTabId(weekday)} className="grid grid-cols-1 gap-4">
      {session && (
        <SessionTable session={session} block={block} language={language} exercisesById={view.exercisesById} mode="client" />
      )}
      {cardio && (
        <section className="grid gap-2">
          <h3 className="text-sm font-semibold text-text-primary">{`${cardio.name} · ${cardioMinutes(cardio)} min`}</h3>
          <ul className="grid gap-1 text-sm text-text-primary">
            {cardio.segments.map(segment => (
              <li key={segment.id}>{cardioSegmentText(segment, view.exercisesById)}</li>
            ))}
          </ul>
        </section>
      )}
      {!session && !cardio && <p className="text-sm text-text-primary">Rest day. A short walk still counts.</p>}
      {cardio && hasIntervals(cardio) && (
        <p className="text-sm text-text-secondary">{templateText('hiitAside', language).text}</p>
      )}
      {(session || cardio) && <p className="text-sm text-text-secondary">{lowEnergy}</p>}
    </div>
  );
}
