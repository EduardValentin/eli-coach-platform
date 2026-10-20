import { CARDIO_INTENSITY_TEXT } from '../../domain/programDefaults';
import { templateText } from '../../domain/programTemplates';
import type { Block, Weekday } from '../../domain/program';
import { CARDIO_TYPE_LABELS } from '../coach-portal/program/program-constants';
import { SessionTable } from './SessionTable';
import { dayPanelId, dayTabId } from './WeekStrip';
import { cardioFor, sessionFor, type ProgramView } from './programView';

type DayContentProps = { view: ProgramView; block: Block; weekday: Weekday };

export function DayContent({ view, block, weekday }: DayContentProps) {
  const { language } = view.program;
  const session = sessionFor(block, weekday);
  const cardio = cardioFor(block, weekday);
  const lowEnergy = templateText('lowEnergy', language).text;

  return (
    <div role="tabpanel" id={dayPanelId(weekday)} aria-labelledby={dayTabId(weekday)} className="grid gap-4">
      {session && (
        <SessionTable session={session} block={block} language={language} exercisesById={view.exercisesById} mode="client" />
      )}
      {cardio && (
        <section className="grid gap-2">
          <h3 className="text-sm font-semibold text-text-primary">
            {CARDIO_TYPE_LABELS[cardio.type]} · {cardio.minutes} min
          </h3>
          <p className="text-sm text-text-primary">{CARDIO_INTENSITY_TEXT[cardio.type]}</p>
        </section>
      )}
      {!session && !cardio && <p className="text-sm text-text-primary">Rest day. A short walk still counts.</p>}
      {cardio?.type === 'hiit' && (
        <p className="text-sm text-text-secondary">{templateText('hiitAside', language).text}</p>
      )}
      {(session || cardio) && <p className="text-sm text-text-secondary">{lowEnergy}</p>}
    </div>
  );
}
