import type { ReactNode } from 'react';
import { DOCUMENT_EYEBROW_CLASS, DOCUMENT_RULE_CLASS, DOCUMENT_SECTION_TITLE_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { BLOCK_RULE } from './blockColours';
import { CheckInDayNote } from './CheckInDayNote';
import { DocumentHeading } from './documentEditing';
import { dayPageAnchor } from './documentWeeks';
import { DAY_TILE_COLUMNS_CLASS, DayTile } from './DayTile';
import { dayDateText, dayPlanName, type WeekDay, type WeekView } from './weekView';

type DayPageRhythm = 'tight' | 'gap';

const RHYTHM_CLASS: Record<DayPageRhythm, string> = { tight: 'space-y-document-tight', gap: 'space-y-document-gap' };

function ruleOf(week: WeekView, day: WeekDay): string {
  return day.plan.kind === 'cardio' ? 'border-training-recovery' : BLOCK_RULE[week.block.type];
}

type HeadIds = { date: string; heading: string };

function DayPageHead({ week, day, ids }: { week: WeekView; day: WeekDay; ids: HeadIds }) {
  return (
    <header data-print-heading className={cn('grid items-center', DAY_TILE_COLUMNS_CLASS, DOCUMENT_RULE_CLASS, ruleOf(week, day))}>
      <DayTile day={day} className="max-sm:hidden" />
      <div className="grid min-w-0 gap-0.5">
        <p id={ids.date} className={cn(DOCUMENT_EYEBROW_CLASS, 'sm:sr-only')}>
          {dayDateText(day)}
        </p>
        <DocumentHeading id={ids.heading} level={4} className={DOCUMENT_SECTION_TITLE_CLASS}>
          {dayPlanName(day.plan)}
        </DocumentHeading>
        {day.checkIn && <CheckInDayNote weekOfPlan={week.weekOfPlan} size="document" />}
      </div>
    </header>
  );
}

type DayPageProps = { week: WeekView; day: WeekDay; rhythm: DayPageRhythm; children: ReactNode };

/** A training day's printed page: its head, ruled in the block's colour or the recovery colour, over the day's content. */
export function DayPage({ week, day, rhythm, children }: DayPageProps) {
  const anchor = dayPageAnchor(week, day);
  const ids: HeadIds = { date: `${anchor}-date`, heading: `${anchor}-heading` };
  return (
    <article id={anchor} aria-labelledby={`${ids.date} ${ids.heading}`} data-print-page className={RHYTHM_CLASS[rhythm]}>
      <DayPageHead week={week} day={day} ids={ids} />
      {children}
    </article>
  );
}
