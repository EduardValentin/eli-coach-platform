import { ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';
import { WIDGET_TITLE_CLASS } from '../typography';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';
import { BlockNumber } from './BlockNumber';
import { weekRangeOf } from '../../domain/programCalendar';
import { dateRangeText } from './programView';
import { weekOfBlockText, weekOfPlanText, type WeekView } from './weekView';

type WeekNavProps = {
  week: WeekView;
  currentWeekOfPlan: number;
  headingId: string;
  note: string | null;
  onChange: (weekOfPlan: number) => void;
};

function rangeOf(week: WeekView): string | null {
  const range = weekRangeOf(week.days);
  return range && dateRangeText(range);
}

function BlockLine({ week }: { week: WeekView }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <BlockNumber block={week.block} index={week.blockIndex} size="xs" />
      <span className="@max-3xl:hidden">{weekOfBlockText(week, 'long')}</span>
      <span className="text-balance @3xl:hidden">{weekOfBlockText(week, 'short')}</span>
    </span>
  );
}

export function WeekNav({ week, currentWeekOfPlan, headingId, note, onChange }: WeekNavProps) {
  const range = rangeOf(week);

  function returnToCurrentWeek() {
    onChange(currentWeekOfPlan);
    document.getElementById(headingId)?.focus({ preventScroll: true });
  }

  return (
    <div className="mx-auto grid w-full max-w-sm grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 @3xl:mx-0 @3xl:flex @3xl:max-w-none @3xl:gap-x-4">
      <div className="col-start-2 row-start-1 min-w-0 text-center @3xl:mr-2 @3xl:flex-1 @3xl:text-left">
        <h2 id={headingId} tabIndex={-1} className={cn(WIDGET_TITLE_CLASS, 'scroll-mt-(--portal-top-bar-clearance) outline-none')}>
          <span className="whitespace-nowrap">{weekOfPlanText(week)}</span>
          {range && <span className="text-sm font-normal whitespace-nowrap text-text-secondary tabular-nums">{` · ${range}`}</span>}
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-text-secondary @3xl:justify-start">
          <BlockLine week={week} />
          {week.calibration && <Badge tone="muted">Calibration week</Badge>}
        </div>
        {note && <p className="text-sm text-text-secondary">{note}</p>}
      </div>
      {week.weekOfPlan !== currentWeekOfPlan && (
        <Button variant="ghost" size="xs" className="col-span-3 row-start-2 mb-3 justify-self-center @3xl:mr-1 @3xl:mb-0" onClick={returnToCurrentWeek}>
          <Undo2 aria-hidden="true" />
          This week
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        className="col-start-1 row-start-1"
        aria-label="Previous week"
        disabled={week.weekOfPlan === 1}
        onClick={() => onChange(week.weekOfPlan - 1)}
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="col-start-3 row-start-1 @3xl:-mr-2.5"
        aria-label="Next week"
        disabled={week.weekOfPlan === week.totalWeeks}
        onClick={() => onChange(week.weekOfPlan + 1)}
      >
        <ChevronRight aria-hidden="true" className="size-5" />
      </Button>
    </div>
  );
}
