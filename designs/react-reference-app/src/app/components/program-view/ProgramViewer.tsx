import { Pencil } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Exercise } from '../../context/TrainingContext';
import type { ProgramVersion, Weekday } from '../../domain/program';
import { EmptyState } from '../EmptyState';
import { cardVariants } from '../ui/card';
import { Tabs, TabsContent } from '../ui/tabs';
import { DayPanel } from './DayPanel';
import { ExerciseDetailProvider } from './ExerciseDetail';
import { NutritionLifestyle } from './NutritionLifestyle';
import { ProgramPlan, type PlanVoice } from './ProgramPlan';
import { programTextPlacement } from './programTextPlacement';
import { ProgramVersions, type VersionStates } from './ProgramVersions';
import { planStatusText, type ProgramView } from './programView';
import { WeekCard } from './WeekCard';
import { WeekNav } from './WeekNav';
import { WeekRailTabs } from './WeekRail';
import type { WeekSelection } from './weekSelection';
import { blockName, clampedWeekOfPlan, currentWeekOfPlan, defaultWeekday, weekOfBlockText, weekOfPlanText, weekViewAt, type WeekDay, type WeekView } from './weekView';

export type UnwrittenBlock = { name: string; start: Date | null };

type ProgramViewerProps = {
  view: ProgramView;
  selection: WeekSelection;
  planPlacement: 'before-week' | 'after-week';
  planVoice: PlanVoice;
  planNotice?: ReactNode;
  versions: readonly ProgramVersion[];
  versionStates: VersionStates;
  versionAction: (version: ProgramVersion) => ReactNode;
  exerciseDetailFooter?: (exercise: Exercise) => ReactNode;
  unwrittenDescription: (block: UnwrittenBlock) => string;
  unwrittenAction?: ReactNode;
};

const WEEK_HEADING_ID = 'program-week';

function scrollToAndFocus(anchorId: string, focusTarget: (anchor: HTMLElement) => HTMLElement | null) {
  const anchor = document.getElementById(anchorId);
  if (!anchor) return;
  anchor.scrollIntoView();
  focusTarget(anchor)?.focus({ preventScroll: true });
}

/** A rest day shows nothing, so a requested rest day falls back to the default day too. */
function shownDayOf(week: WeekView, requested: Weekday | null): WeekDay | undefined {
  const chosen = week.days.find(day => day.weekday === requested && day.plan.kind !== 'rest');
  return chosen ?? week.days.find(day => day.weekday === defaultWeekday(week));
}

export function ProgramViewer({
  view,
  selection,
  planPlacement,
  planVoice,
  planNotice,
  versions,
  versionStates,
  versionAction,
  exerciseDetailFooter,
  unwrittenDescription,
  unwrittenAction,
}: ProgramViewerProps) {
  const [announcement, setAnnouncement] = useState('');
  const week = weekViewAt(view, clampedWeekOfPlan(view, selection.week));
  const shownDay = shownDayOf(week, selection.day);
  const texts = programTextPlacement(view, week.block);
  const context = { view, week, texts };
  const railLabel = `Days of ${weekOfPlanText(week).toLowerCase()}`;

  function changeWeek(weekOfPlan: number) {
    const next = weekViewAt(view, weekOfPlan);
    selection.choose({ week: weekOfPlan === currentWeekOfPlan(view) ? null : weekOfPlan, day: null });
    setAnnouncement(`${weekOfPlanText(next)}, ${weekOfBlockText(next, 'long')}`);
  }

  function showWeek(weekOfPlan: number) {
    changeWeek(weekOfPlan);
    scrollToAndFocus(WEEK_HEADING_ID, anchor => anchor);
  }

  const plan = (
    <>
      <ProgramPlan view={view} voice={planVoice} lead={texts.plan} notice={planNotice} shownWeek={week.weekOfPlan} weekAction={{ kind: 'select', label: 'Show in the week card', onSelect: showWeek }} />
      <NutritionLifestyle texts={texts} />
    </>
  );
  const card = (rail: ReactNode) => (
    <WeekCard
      week={week}
      texts={texts}
      nav={
        <WeekNav
          week={week}
          currentWeekOfPlan={currentWeekOfPlan(view)}
          headingId={WEEK_HEADING_ID}
          note={planStatusText(view)}
          texts={texts.blockAndSplit}
          onChange={changeWeek}
        />
      }
      rail={rail}
    />
  );

  return (
    <ExerciseDetailProvider footer={exerciseDetailFooter}>
      <div className="@container grid grid-cols-1 gap-6 lg:gap-8">
        {planPlacement === 'before-week' && plan}
        <section aria-labelledby={WEEK_HEADING_ID} className="grid grid-cols-1 gap-3">
          {week.isWritten && shownDay ? (
            <Tabs variant="rail" value={shownDay.weekday} onValueChange={day => selection.choose({ day: day as Weekday })} className="gap-3">
              {card(<WeekRailTabs label={railLabel} week={week} restDays="inert" />)}
              <TabsContent value={shownDay.weekday}>
                <DayPanel key={`${week.weekOfPlan}-${shownDay.weekday}`} day={shownDay} context={context} />
              </TabsContent>
            </Tabs>
          ) : (
            <>
              {card(null)}
              <div className={cardVariants({ variant: 'panel' })}>
                <EmptyState
                  icon={Pencil}
                  title="This block isn't written yet"
                  description={unwrittenDescription({ name: blockName(week.block), start: week.blockStart })}
                  action={unwrittenAction}
                />
              </div>
            </>
          )}
          <p role="status" className="sr-only">
            {announcement}
          </p>
        </section>
        {planPlacement === 'after-week' && plan}
        <ProgramVersions versions={versions} states={versionStates} action={versionAction} />
      </div>
    </ExerciseDetailProvider>
  );
}
