import { hasHardRounds } from '../../domain/programCardio';
import { templateText } from '../../domain/programTemplates';
import { cardioOn, sessionOn, type Block, type Weekday } from '../../domain/program';
import { CardioDay } from './CardioDay';
import { SessionDay } from './SessionDay';
import { dayPanelId, dayTabId } from './WeekStrip';
import type { ProgramView } from './programView';

type DayContentProps = { view: ProgramView; block: Block; weekday: Weekday };

const NOTE_CLASS = 'text-sm leading-relaxed text-text-secondary';

export function DayContent({ view, block, weekday }: DayContentProps) {
  const { language } = view.program;
  const session = sessionOn(block, weekday);
  const cardio = cardioOn(block, weekday);

  return (
    <div role="tabpanel" id={dayPanelId(weekday)} aria-labelledby={dayTabId(weekday)} className="grid grid-cols-1 gap-4">
      {session && <SessionDay session={session} exercisesById={view.exercisesById} language={language} />}
      {cardio && <CardioDay cardio={cardio} exercisesById={view.exercisesById} />}
      {!session && !cardio && <p className="py-6 text-center text-sm text-text-secondary">Rest day. A short walk still counts.</p>}
      {cardio && hasHardRounds(cardio) && <p className={NOTE_CLASS}>{templateText('hiitAside', language).text}</p>}
      {(session || cardio) && <p className={NOTE_CLASS}>{templateText('lowEnergy', language).text}</p>}
    </div>
  );
}
