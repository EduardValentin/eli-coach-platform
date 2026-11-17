import { useId, useRef } from 'react';
import type { Exercise } from '../../../context/TrainingContext';
import { Bed, Dumbbell, HeartPulse } from 'lucide-react';
import { WEEKDAY_LABELS, WEEKDAYS, type Block, type Weekday } from '../../../domain/program';
import { emptyCardioSession } from '../../../domain/programCardio';
import { blockWithDay, describeLoss, type DayChoice } from '../../../domain/weekEditing';
import { DayCell, dayCellVariants } from '../../program-view/DayCell';
import { planOn, type DayPlan, type WeekDay } from '../../program-view/weekView';
import { RowActionsMenu } from '../../RowActionsMenu';
import { WIDGET_TITLE_CLASS } from '../../typography';
import { useResetConfirm } from './ResetConfirm';

type WeekDaysProps = { block: Block; library: readonly Exercise[]; onChange: (block: Block) => void; onOpenSession: (sessionId: string) => void };
type DayMenuProps = { block: Block; day: Weekday; onChoose: (choice: DayChoice, trigger: HTMLElement | null) => void };

function DayMenu({ block, day, onChoose }: DayMenuProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const choose = (choice: DayChoice) => onChoose(choice, trigger.current);

  return (
    <RowActionsMenu
      label={`${WEEKDAY_LABELS[day]} options`}
      size="xs"
      triggerRef={trigger}
      actions={[
        {
          name: 'session',
          label: 'Session',
          icon: Dumbbell,
          actions: block.sessions.map(session => ({
            name: session.id,
            label: session.name,
            onSelect: () => choose({ kind: 'session', sessionId: session.id }),
          })),
        },
        { name: 'cardio', label: 'Cardio', icon: HeartPulse, onSelect: () => choose({ kind: 'cardio', session: emptyCardioSession() }) },
        { name: 'rest', label: 'Rest', icon: Bed, onSelect: () => choose({ kind: 'rest' }) },
      ]}
    />
  );
}

function openableIdOf(plan: DayPlan): string | null {
  if (plan.kind === 'session') return plan.session.id;
  return plan.kind === 'cardio' ? plan.cardio.id : null;
}

function dayTitle(block: Block, day: Weekday, choice: DayChoice): string {
  const weekday = WEEKDAY_LABELS[day];
  if (choice.kind === 'rest') return `Make ${weekday} a rest day?`;
  if (choice.kind === 'cardio') return `Make ${weekday} a cardio day?`;
  const name = block.sessions.find(session => session.id === choice.sessionId)?.name ?? 'the session';
  return `Put ${name} on ${weekday}?`;
}

function lostByChoice(block: Block, day: Weekday, choice: DayChoice): string[] {
  const keepsContent = choice.kind !== 'rest' && choice.kind === block.calendar[day].kind;
  return keepsContent ? [] : describeLoss(block, { kind: 'day', weekday: day });
}

export function WeekDays({ block, library, onChange, onOpenSession }: WeekDaysProps) {
  const headingId = useId();
  const confirm = useResetConfirm();
  const exercisesById = new Map(library.map(exercise => [exercise.id, exercise]));
  return (
    <section aria-labelledby={headingId} className="grid grid-cols-[minmax(0,1fr)] gap-2 lg:**:scroll-mt-[calc(var(--block-header-height)+0.5rem)]">
      <h3 id={headingId} className={WIDGET_TITLE_CLASS}>
        Week
      </h3>
      <ol className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-4">
        {WEEKDAYS.map(weekday => {
          const day: WeekDay = { weekday, date: null, checkIn: false, isToday: false, plan: planOn(block, weekday) };
          const openableId = openableIdOf(day.plan);
          const face = <DayCell day={day} exercisesById={exercisesById} variant="card" />;
          return (
            <li key={weekday} className="relative grid">
              <h4 className="sr-only">{WEEKDAY_LABELS[weekday]}</h4>
              {openableId === null ? (
                <div className={dayCellVariants({ variant: 'card', kind: day.plan.kind })}>{face}</div>
              ) : (
                <button type="button" onClick={() => onOpenSession(openableId)} className={dayCellVariants({ variant: 'card', kind: day.plan.kind })}>
                  {face}
                </button>
              )}
              <div className="absolute top-1 right-1">
                <DayMenu
                  block={block}
                  day={weekday}
                  onChoose={(choice, trigger) =>
                    confirm.request({
                      title: dayTitle(block, weekday, choice),
                      confirmLabel: 'Change day',
                      lines: lostByChoice(block, weekday, choice),
                      apply: () => onChange(blockWithDay(block, weekday, choice)),
                      returnFocus: trigger,
                    })
                  }
                />
              </div>
            </li>
          );
        })}
      </ol>
      {confirm.dialog}
    </section>
  );
}
