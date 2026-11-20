import { useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { Exercise } from '../../../context/TrainingContext';
import { ArrowRight } from 'lucide-react';
import { WEEKDAY_LABELS, WEEKDAYS, weekdayAbbreviation, type Block, type LevelHint, type Weekday } from '../../../domain/program';
import { emptyCardioSession } from '../../../domain/programCardio';
import { longestWeekOf, type TimingContext } from '../../../domain/sessionTiming';
import { blockWithDay, describeLoss, type DayChoice } from '../../../domain/weekEditing';
import { useContainerWidthRem } from '../../../hooks/useContainerWidthRem';
import { DayFace, dayCellVariants, KIND_ICON } from '../../program-view/DayCell';
import type { ExerciseLibrary } from '../../program-view/programView';
import { dayLengthOf, dayPlanName, planOn, type DayPlan, type WeekDay } from '../../program-view/weekView';
import { WeekRailTabs } from '../../program-view/WeekRail';
import { RowActionsMenu } from '../../RowActionsMenu';
import { EYEBROW_CLASS, WIDGET_TITLE_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { cardVariants } from '../../ui/card';
import { Tabs, TabsContent } from '../../ui/tabs';
import { cn } from '../../ui/utils';
import { useDestructiveConfirm } from './DestructiveConfirm';

type WeekDaysProps = { block: Block; level: LevelHint; library: readonly Exercise[]; onChange: (block: Block) => void; onOpenSession: (sessionId: string) => void };
type DayMenuProps = { block: Block; day: Weekday; onChoose: (choice: DayChoice, trigger: HTMLElement | null) => void };
type ChooseDay = (day: Weekday, choice: DayChoice, trigger: HTMLElement | null) => void;
type WeekLayout = 'row' | 'rail';

/** Seven columns of at least 5.5rem with the 0.5rem gaps between them. */
const ROW_MIN_REM = 7 * 5.5 + 6 * 0.5;

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
          icon: KIND_ICON.session,
          actions: block.sessions.map(session => ({
            name: session.id,
            label: session.name,
            onSelect: () => choose({ kind: 'session', sessionId: session.id }),
          })),
        },
        { name: 'cardio', label: 'Cardio', icon: KIND_ICON.cardio, onSelect: () => choose({ kind: 'cardio', session: emptyCardioSession() }) },
        { name: 'rest', label: 'Rest', icon: KIND_ICON.rest, onSelect: () => choose({ kind: 'rest' }) },
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

function plannedDay(weekday: Weekday, timing: TimingContext): DayPlan {
  const plan = planOn(timing.block, weekday);
  return plan.kind === 'session' ? { kind: 'session', session: longestWeekOf(plan.session, timing) } : plan;
}

function weekOf(timing: TimingContext): WeekDay[] {
  return WEEKDAYS.map(weekday => ({ weekday, date: null, checkIn: false, isToday: false, plan: plannedDay(weekday, timing) }));
}

function useWeekLayout(): { ref: RefObject<HTMLElement>; layout: WeekLayout } {
  const { ref, widthRem } = useContainerWidthRem<HTMLElement>();
  return { ref, layout: widthRem > 0 && widthRem < ROW_MIN_REM ? 'rail' : 'row' };
}

type DayCardProps = { day: WeekDay; exercisesById: ExerciseLibrary; menu: ReactNode; onOpenSession: (sessionId: string) => void };

/** The weekday and the options share the card's top line; the face below is the one open control, and its pointer area covers the card. */
function DayCard({ day, exercisesById, menu, onOpenSession }: DayCardProps) {
  const openableId = openableIdOf(day.plan);
  return (
    <div className={dayCellVariants({ variant: 'compact', kind: day.plan.kind })}>
      <h4 className={cn(EYEBROW_CLASS, 'col-start-1 row-start-1')}>
        <span aria-hidden="true">{weekdayAbbreviation(day.weekday)}</span>
        <span className="sr-only">{WEEKDAY_LABELS[day.weekday]}</span>
      </h4>
      <DayFace day={day} exercisesById={exercisesById} onOpen={openableId === null ? undefined : () => onOpenSession(openableId)} />
      <div className="relative z-10 col-start-2 row-start-1 -mt-1 -mr-1.5 flex items-center">{menu}</div>
    </div>
  );
}

type BuilderWeekProps = { block: Block; days: WeekDay[]; exercisesById: ExerciseLibrary; onOpenSession: (sessionId: string) => void; onChoose: ChooseDay };

function BuilderWeekRow({ block, days, exercisesById, onOpenSession, onChoose }: BuilderWeekProps) {
  return (
    <ol className="grid grid-cols-7 gap-x-2">
      {days.map(day => (
        <li key={day.weekday} className="grid">
          <DayCard
            day={day}
            exercisesById={exercisesById}
            onOpenSession={onOpenSession}
            menu={<DayMenu block={block} day={day.weekday} onChoose={(choice, trigger) => onChoose(day.weekday, choice, trigger)} />}
          />
        </li>
      ))}
    </ol>
  );
}

function initialRailDay(days: readonly WeekDay[]): Weekday {
  return (days.find(day => openableIdOf(day.plan) !== null) ?? days[0]).weekday;
}

function BuilderWeekTabs({ block, days, exercisesById, onOpenSession, onChoose }: BuilderWeekProps) {
  const [selected, setSelected] = useState<Weekday>(() => initialRailDay(days));
  const day = days.find(candidate => candidate.weekday === selected) ?? days[0];
  const openableId = openableIdOf(day.plan);
  const length = dayLengthOf(day.plan, exercisesById)?.shown;
  return (
    <Tabs variant="rail" value={selected} onValueChange={value => setSelected(value as Weekday)} className="gap-3">
      <WeekRailTabs label="Days" week={{ days }} wrap="one-row" />
      <TabsContent value={selected} className={cn(cardVariants({ variant: 'quiet' }), 'grid gap-5 p-3')}>
        <div className="flex items-center justify-between gap-3">
          <h4 className={WIDGET_TITLE_CLASS}>{WEEKDAY_LABELS[day.weekday]}</h4>
          <DayMenu block={block} day={day.weekday} onChoose={(choice, trigger) => onChoose(day.weekday, choice, trigger)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <p className="text-sm text-text-primary">
            {dayPlanName(day.plan)}
            {length && <span className="text-text-secondary tabular-nums">{` · ${length}`}</span>}
          </p>
          {openableId !== null && (
            <Button variant="outline" size="sm" onClick={() => onOpenSession(openableId)}>
              Open session
              <ArrowRight aria-hidden="true" />
            </Button>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function WeekSection({ headingId, layoutRef, children }: { headingId: string; layoutRef: RefObject<HTMLElement>; children: ReactNode }) {
  return (
    <section
      ref={layoutRef}
      aria-labelledby={headingId}
      className="@container grid grid-cols-[minmax(0,1fr)] gap-2 lg:**:scroll-mt-[calc(var(--block-header-height)+0.5rem)]"
    >
      <h3 id={headingId} className={WIDGET_TITLE_CLASS}>
        Week
      </h3>
      {children}
    </section>
  );
}

export function WeekDays({ block, level, library, onChange, onOpenSession }: WeekDaysProps) {
  const headingId = useId();
  const confirm = useDestructiveConfirm();
  const { ref, layout } = useWeekLayout();
  const exercisesById = new Map(library.map(exercise => [exercise.id, exercise]));
  const days = weekOf({ block, level, exercises: exercisesById });

  function choose(day: Weekday, choice: DayChoice, trigger: HTMLElement | null) {
    confirm.request({
      title: dayTitle(block, day, choice),
      confirmLabel: 'Change day',
      lines: lostByChoice(block, day, choice),
      apply: () => onChange(blockWithDay(block, day, choice)),
      returnFocus: trigger,
    });
  }

  const view = { block, days, exercisesById, onOpenSession, onChoose: choose };
  return (
    <WeekSection headingId={headingId} layoutRef={ref}>
      {layout === 'row' ? <BuilderWeekRow {...view} /> : <BuilderWeekTabs {...view} />}
      {confirm.dialog}
    </WeekSection>
  );
}
