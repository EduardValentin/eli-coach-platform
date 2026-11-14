import { format, isSameMonth } from 'date-fns';
import { weekdayAbbreviation, type Block, type Weekday } from '../../domain/program';
import { blockWeeks, type BlockDay, type BlockWeek } from '../../domain/programCalendar';
import { DOCUMENT_LABEL_CLASS, DOCUMENT_NOTE_CLASS, DOCUMENT_SECTION_TITLE_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { BLOCK_SOFT, BLOCK_SWATCH } from './blockColours';
import { DocumentHeading } from './documentEditing';
import { dayEntryLabel, type ProgramView } from './programView';

type DayKind = 'session' | 'cardio' | 'rest';

const KIND_FILL: Record<Exclude<DayKind, 'session'>, string> = {
  cardio: 'bg-training-recovery-soft',
  rest: '',
};

const KIND_MARK: Record<Exclude<DayKind, 'session'>, string> = {
  cardio: 'bg-training-recovery',
  rest: '',
};

const KIND_NAME: Record<DayKind, string> = {
  session: 'font-semibold text-text-primary',
  cardio: 'font-medium text-training-recovery',
  rest: 'text-text-secondary',
};

const CELL_CLASS =
  'border border-divider align-top max-sm:flex max-sm:items-center max-sm:gap-3 max-sm:border-0 max-sm:border-t max-sm:py-2 max-sm:pr-3 max-sm:pl-4 sm:h-16 sm:py-1 sm:pr-1 sm:pl-2';

function calendarTitle(block: Block): string {
  return block.weeks === 1 ? 'Your week' : `Your ${block.weeks} weeks`;
}

function weekRange(week: BlockWeek): string | null {
  const first = week.days[0].date;
  const last = week.days.at(-1)?.date;
  if (!first || !last) return null;
  if (isSameMonth(first, last)) return `${format(first, 'd')}–${format(last, 'd MMM')}`;
  return `${format(first, 'd MMM')} – ${format(last, 'd MMM')}`;
}

function TickBox() {
  return <span role="img" aria-label="Tick box" className="inline-block size-3.5 shrink-0 rounded-checkbox border-[1.5px] border-text-secondary bg-surface-base" />;
}

const CHECK_IN_DATE_CLASS = 'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-check-in-marker px-1 text-surface-base';

function DayDate({ date, checkIn }: { date: Date; checkIn: boolean }) {
  return (
    <>
      <time dateTime={format(date, 'yyyy-MM-dd')} className={cn({ [CHECK_IN_DATE_CLASS]: checkIn })}>
        {format(date, 'd')}
      </time>
      {checkIn && <span className="sr-only">, check-in form due</span>}
    </>
  );
}

type DayCellProps = { block: Block; day: BlockDay };

function DayCell({ block, day }: DayCellProps) {
  const kind = block.calendar[day.weekday].kind;
  const trains = kind !== 'rest';
  const fill = kind === 'session' ? BLOCK_SOFT[block.type] : KIND_FILL[kind];
  const mark = kind === 'session' ? BLOCK_SWATCH[block.type] : KIND_MARK[kind];
  return (
    <td role="cell" className={cn(CELL_CLASS, fill, 'relative')}>
      {trains && <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-[3px]', mark)} />}
      <span className={cn(DOCUMENT_NOTE_CLASS, 'block min-h-5 font-semibold tabular-nums max-sm:w-14 max-sm:shrink-0')}>
        <span aria-hidden="true" className="sm:hidden">{`${weekdayAbbreviation(day.weekday)} `}</span>
        {day.date && <DayDate date={day.date} checkIn={day.checkIn} />}
      </span>{' '}
      <span className={cn('block text-document-table leading-tight text-balance max-sm:flex-1 sm:mt-0.5', KIND_NAME[kind])}>{dayEntryLabel(block, day.weekday)}</span>
      {trains && (
        <span className="flex sm:absolute sm:top-1 sm:right-1">
          {' '}
          <TickBox />
        </span>
      )}
    </td>
  );
}

function WeekHeader({ block, week }: { block: Block; week: BlockWeek }) {
  const range = weekRange(week);
  const calibration = block.calibrationWeek && week.week === 1;
  return (
    <th
      role="rowheader"
      scope="row"
      className="border border-divider px-1.5 py-1 text-left align-top font-normal max-sm:flex max-sm:items-baseline max-sm:gap-2 max-sm:border-0 max-sm:bg-surface-subtle max-sm:px-3 max-sm:py-1.5"
    >
      <span className="block text-document-table font-semibold text-text-primary">{`Week ${week.week}`}</span>
      {range && <span className={cn(DOCUMENT_NOTE_CLASS, 'block tabular-nums')}>{` ${range}`}</span>}
      {calibration && <span className={cn(DOCUMENT_NOTE_CLASS, 'block italic')}> Calibration</span>}
    </th>
  );
}

function weekdaysOf(weeks: readonly BlockWeek[]): Weekday[] {
  return weeks[0].days.map(day => day.weekday);
}

export function BlockCalendar({ view, block }: { view: ProgramView; block: Block }) {
  const { blocks } = view.version.content.plan;
  const weeks = blockWeeks({ blocks, dayOne: view.dayOne }, blocks.indexOf(block), view.preferredWeekday);
  const title = calendarTitle(block);
  const firstCheckIn = weeks.flatMap(week => week.days).find(day => day.checkIn)?.date;
  return (
    <section aria-label={title} data-print-keep className="space-y-document-tight">
      <DocumentHeading level={2} className={DOCUMENT_SECTION_TITLE_CLASS}>
        {title}
      </DocumentHeading>
      <table role="table" aria-label={title} className="w-full border-collapse max-sm:block sm:table-fixed">
        <thead role="rowgroup" className="max-sm:sr-only">
          <tr role="row">
            <td className="w-[12%]" />
            {weekdaysOf(weeks).map(weekday => (
              <th key={weekday} role="columnheader" scope="col" className={cn(DOCUMENT_LABEL_CLASS, 'px-1.5 pb-1 text-left')}>
                {weekdayAbbreviation(weekday)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup" className="max-sm:block max-sm:space-y-2">
          {weeks.map(week => (
            <tr role="row" key={week.week} data-print-keep className="max-sm:block max-sm:overflow-hidden max-sm:rounded-field max-sm:border max-sm:border-divider">
              <WeekHeader block={block} week={week} />
              {week.days.map(day => (
                <DayCell key={day.weekday} block={block} day={day} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={cn(DOCUMENT_NOTE_CLASS, 'flex flex-wrap items-center gap-x-4 gap-y-1')}>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-3.5 rounded-checkbox border-[1.5px] border-text-secondary" />
          Tick each session once it’s done
        </span>
        {firstCheckIn && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={cn(CHECK_IN_DATE_CLASS, 'font-semibold tabular-nums')}>
              {format(firstCheckIn, 'd')}
            </span>
            Send your check-in form that day
          </span>
        )}
      </p>
    </section>
  );
}
