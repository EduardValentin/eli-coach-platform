import { ChevronLeft, ChevronRight } from 'lucide-react';
import { splitLabel } from '../../domain/splitTemplates';
import { weekRangeOf } from '../../domain/programCalendar';
import { SUPPORTING_TEXT_CLASS, WIDGET_TITLE_CLASS } from '../typography';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';
import { BlockNumber } from './BlockNumber';
import { InlineTextButton } from './InlineTextButton';
import type { TextPart } from './programTextPlacement';
import { dailyStepsText, dateRangeText } from './programView';
import { TargetsSummary } from './TargetsSummary';
import { TextDisclosureTrigger } from './TextDisclosure';
import { weekOfBlockText, weekOfPlanText, type WeekView } from './weekView';

export const WEEK_TEXTS = 'block-and-split';

type WeekNavProps = {
  week: WeekView;
  currentWeekOfPlan: number;
  headingId: string;
  note: string | null;
  texts: readonly TextPart[];
  onChange: (weekOfPlan: number) => void;
};

function rangeOf(week: WeekView): string | null {
  const range = weekRangeOf(week.days);
  return range && dateRangeText(range);
}

function SplitName({ week, texts }: { week: WeekView; texts: readonly TextPart[] }) {
  if (texts.length === 0) return <span className="text-sm text-text-primary">{splitLabel(week.block)}</span>;
  return <TextDisclosureTrigger value={WEEK_TEXTS}>{splitLabel(week.block)}</TextDisclosureTrigger>;
}

function BlockLine({ week }: { week: WeekView }) {
  return (
    <p className={cn(SUPPORTING_TEXT_CLASS, 'flex flex-wrap items-center gap-x-3 gap-y-2')}>
      <span className="flex items-center gap-2">
        <BlockNumber block={week.block} index={week.blockIndex} size="xs" />
        <span className="@max-3xl:hidden">{weekOfBlockText(week, 'long')}</span>
        <span className="@3xl:hidden">{weekOfBlockText(week, 'short')}</span>
      </span>
      {week.calibration && <Badge tone="muted">Calibration week</Badge>}
    </p>
  );
}

export function WeekNav({ week, currentWeekOfPlan, headingId, note, texts, onChange }: WeekNavProps) {
  const range = rangeOf(week);
  const awayFromCurrentWeek = week.weekOfPlan !== currentWeekOfPlan;

  function returnToCurrentWeek() {
    onChange(currentWeekOfPlan);
    document.getElementById(headingId)?.focus({ preventScroll: true });
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
        <div className="grid gap-0.5">
          <h2 id={headingId} tabIndex={-1} className={cn(WIDGET_TITLE_CLASS, 'scroll-mt-(--portal-top-bar-clearance) outline-none')}>
            {weekOfPlanText(week)}
          </h2>
          {(range || awayFromCurrentWeek) && (
            <div className={cn(SUPPORTING_TEXT_CLASS, 'flex flex-wrap items-center gap-x-4 gap-y-3')}>
              {range && <p className="tabular-nums">{range}</p>}
              {awayFromCurrentWeek && (
                <InlineTextButton leading="return" onClick={returnToCurrentWeek}>
                  This week
                </InlineTextButton>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon-sm" aria-label="Previous week" disabled={week.weekOfPlan === 1} onClick={() => onChange(week.weekOfPlan - 1)}>
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next week" disabled={week.weekOfPlan === week.totalWeeks} onClick={() => onChange(week.weekOfPlan + 1)}>
            <ChevronRight aria-hidden="true" className="size-5" />
          </Button>
        </div>
      </div>
      <div className="grid gap-2">
        <BlockLine week={week} />
        {week.isWritten && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <SplitName week={week} texts={texts} />
            <TargetsSummary items={[{ term: 'Daily steps', value: dailyStepsText(week.block) }]} size="sm" />
          </div>
        )}
        {note && <p className={SUPPORTING_TEXT_CLASS}>{note}</p>}
      </div>
    </div>
  );
}
