import { hasIntervals } from '../../domain/programCardio';
import { templateText } from '../../domain/programTemplates';
import type { Block, Weekday } from '../../domain/program';
import { CardioDay } from './CardioDay';
import { SessionDay } from './SessionDay';
import { dayPanelId, dayTabId } from './WeekStrip';
import { cardioFor, sessionFor, type ProgramView } from './programView';

type DayContentProps = { view: ProgramView; block: Block; weekday: Weekday };

const NOTE_CLASS = 'text-sm leading-relaxed text-text-secondary';

export function DayContent({ view, block, weekday }: DayContentProps) {
  const { language } = view.program;
  const session = sessionFor(block, weekday);
  const cardio = cardioFor(block, weekday);

  return (
    <div role="tabpanel" id={dayPanelId(weekday)} aria-labelledby={dayTabId(weekday)} className="grid grid-cols-1 gap-4">
      {session && <SessionDay session={session} exercisesById={view.exercisesById} language={language} />}
      {cardio && <CardioDay cardio={cardio} exercisesById={view.exercisesById} />}
      {!session && !cardio && <p className="py-6 text-center text-sm text-text-secondary">Rest day. A short walk still counts.</p>}
      {cardio && hasIntervals(cardio) && <p className={NOTE_CLASS}>{templateText('hiitAside', language).text}</p>}
      {(session || cardio) && <p className={NOTE_CLASS}>{templateText('lowEnergy', language).text}</p>}
    </div>
  );
}
