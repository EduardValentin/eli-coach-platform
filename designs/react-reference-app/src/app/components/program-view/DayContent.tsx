import { hasHardRounds } from '../../domain/programCardio';
import { cardioOn, sessionOn, type Block, type Weekday } from '../../domain/program';
import { CardioDay } from './CardioDay';
import { SessionDay } from './SessionDay';
import { dayPanelId, dayTabId } from './WeekStrip';
import { programTemplate } from './ProgramText';
import { plainText, type ProgramView } from './programView';

type DayContentProps = { view: ProgramView; block: Block; weekday: Weekday };

const NOTE_CLASS = 'text-sm leading-relaxed text-text-secondary';

export function DayContent({ view, block, weekday }: DayContentProps) {
  const session = sessionOn(block, weekday);
  const cardio = cardioOn(block, weekday);

  return (
    <div role="tabpanel" id={dayPanelId(weekday)} aria-labelledby={dayTabId(weekday)} className="grid grid-cols-1 gap-4">
      {session && <SessionDay session={session} exercisesById={view.exercisesById} progressionText={plainText(programTemplate(view, 'progression'))} />}
      {cardio && <CardioDay cardio={cardio} exercisesById={view.exercisesById} />}
      {!session && !cardio && <p className="py-6 text-center text-sm text-text-secondary">{programTemplate(view, 'restDay')}</p>}
      {cardio && hasHardRounds(cardio) && <p className={NOTE_CLASS}>{programTemplate(view, 'hiitAside')}</p>}
      {(session || cardio) && <p className={NOTE_CLASS}>{programTemplate(view, 'lowEnergy')}</p>}
    </div>
  );
}
