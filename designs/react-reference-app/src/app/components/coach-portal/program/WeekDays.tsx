import { useId, useRef } from 'react';
import type { Exercise } from '../../../context/TrainingContext';
import { Bed, Dumbbell, HeartPulse } from 'lucide-react';
import { WEEKDAY_LABELS, WEEKDAYS, type Block, type Weekday } from '../../../domain/program';
import { emptyCardioSession } from '../../../domain/programCardio';
import { blockWithDay, describeLoss, type DayChoice } from '../../../domain/weekEditing';
import { DAY_CARDS_CLASS, DayCard } from '../../program-view/dayCard';
import { RowActionsMenu } from '../../RowActionsMenu';
import { WIDGET_TITLE_CLASS } from '../../typography';
import { cn } from '../../ui/utils';
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
      <ol className={cn(DAY_CARDS_CLASS, 'sm:grid-cols-7')}>
        {WEEKDAYS.map(day => (
          <DayCard
            key={day}
            block={block}
            day={day}
            exercisesById={exercisesById}
            headingLevel="h4"
            corner={
              <DayMenu
                block={block}
                day={day}
                onChoose={(choice, trigger) =>
                  confirm.request({
                    title: dayTitle(block, day, choice),
                    confirmLabel: 'Change day',
                    lines: lostByChoice(block, day, choice),
                    apply: () => onChange(blockWithDay(block, day, choice)),
                    returnFocus: trigger,
                  })
                }
              />
            }
            renderChip={chip => (
              <button type="button" onClick={() => onOpenSession(chip.id)} className={chip.className}>
                {chip.label}
              </button>
            )}
          />
        ))}
      </ol>
      {confirm.dialog}
    </section>
  );
}
