import { weekRangeOf } from '../../domain/programCalendar';
import { Reading } from '../Reading';
import { DOCUMENT_META_CLASS, DOCUMENT_RULE_CLASS, DOCUMENT_SECTION_TITLE_CLASS } from '../typography';
import { linkVariants } from '../ui/link';
import { cn } from '../ui/utils';
import { BLOCK_RULE } from './blockColours';
import { BlockNumber } from './BlockNumber';
import { CheckInDayNote } from './CheckInDayNote';
import { DocumentHeading } from './documentEditing';
import { guide, LedProse } from './documentProse';
import { DocumentTextSlot } from './DocumentTextSlot';
import { dayPageAnchor, GLANCE_ANCHOR, trainingDays, weekAnchor } from './documentWeeks';
import { dailyStepsText, longRangeText, type ProgramView } from './programView';
import { WeekAgenda } from './WeekAgenda';
import { weekOfBlockText, type WeekDay, type WeekView } from './weekView';

function WeekHead({ week, headingId }: { week: WeekView; headingId: string }) {
  const range = weekRangeOf(week.days);
  return (
    <header
      data-print-heading
      className={cn('grid items-baseline gap-x-6 gap-y-1 sm:grid-cols-[max-content_minmax(0,1fr)]', DOCUMENT_RULE_CLASS, BLOCK_RULE[week.block.type])}
    >
      <DocumentHeading id={headingId} level={3} className={cn(DOCUMENT_SECTION_TITLE_CLASS, 'sm:whitespace-nowrap')}>
        {range ? longRangeText(range) : `Week ${week.weekOfPlan}`}
      </DocumentHeading>
      <p className={cn(DOCUMENT_META_CLASS, 'flex items-center gap-2 sm:justify-self-end')}>
        <BlockNumber block={week.block} index={week.blockIndex} size="xs" />
        {weekOfBlockText(week, 'heading')}
      </p>
    </header>
  );
}

export function WeekOverviewPage({ view, week }: { view: ProgramView; week: WeekView }) {
  const anchor = weekAnchor(week.weekOfPlan);
  const headingId = `${anchor}-heading`;
  const withPages = new Set(trainingDays(week).map(day => day.weekday));
  const checkInWithoutPage = week.isWritten && week.days.some(day => day.checkIn && !withPages.has(day.weekday));
  return (
    <article id={anchor} aria-labelledby={headingId} data-print-page className="space-y-document-gap">
      <WeekHead week={week} headingId={headingId} />
      <Reading label="Daily steps" value={dailyStepsText(week.block)} unit="every day" size="document" />
      <a href={`#${GLANCE_ANCHOR}`} className={cn(linkVariants({ variant: 'inline', reach: 'touch' }), 'text-sm font-medium sm:hidden')}>
        Back to your program at a glance
      </a>
      <WeekAgenda
        days={week.days}
        exercisesById={view.exercisesById}
        state={week.isWritten ? 'planned' : 'to-come'}
        hrefOf={(day: WeekDay) => (withPages.has(day.weekday) ? `#${dayPageAnchor(week, day)}` : undefined)}
      />
      {checkInWithoutPage && <CheckInDayNote weekOfPlan={week.weekOfPlan} size="document" />}
      {week.calibration && (
        <DocumentTextSlot view={view} target={guide('calibration')}>
          {value => <LedProse text={value} />}
        </DocumentTextSlot>
      )}
    </article>
  );
}
