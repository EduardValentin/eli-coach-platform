import { format, getDate, isSameMonth } from 'date-fns';
import { weekdayAbbreviation, type Block, type Weekday } from '../../domain/program';
import { blockWeeks, type BlockDay, type BlockWeek } from '../../domain/programCalendar';
import { DOCUMENT_HEAD_CLASS, DOCUMENT_NOTE_CLASS, DOCUMENT_SECTION_TITLE_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { BLOCK_SOFT, BLOCK_SWATCH } from './blockColours';
import { DocumentHeading } from './documentEditing';
import { PositionBadge } from './PositionBadge';
import { dayEntryLabel, type ProgramView } from './programView';

type DayKind = 'session' | 'cardio' | 'rest';

const TITLE = 'Calendar';
const FIRST_OF_MONTH = 1;

const KIND_NAME: Record<DayKind, string> = {
  session: 'font-semibold text-text-primary',
  cardio: 'font-medium text-text-primary',
  rest: 'text-text-secondary',
};

const CELL_CLASS =
  'relative border border-divider align-top max-sm:flex max-sm:items-baseline max-sm:gap-3 max-sm:border-0 max-sm:border-t max-sm:py-2 max-sm:pr-3 max-sm:pl-4 sm:h-14 sm:py-1 sm:pr-1 sm:pl-2 print:h-[12.5mm] print:pt-[0.2mm] print:pb-0';
const TICK_BOX_CLASS = 'inline-block size-[4mm] shrink-0 rounded-checkbox border-[1pt] border-text-primary bg-surface-base';

function weekRange(week: BlockWeek): string | null {
  const first = week.days[0].date;
  const last = week.days.at(-1)?.date;
  if (!first || !last) return null;
  if (isSameMonth(first, last)) return `${format(first, 'd')}–${format(last, 'd MMM')}`;
  return `${format(first, 'd MMM')}–${format(last, 'd MMM')}`;
}

function dayNumber(date: Date): string {
  return getDate(date) === FIRST_OF_MONTH ? format(date, 'd MMM') : format(date, 'd');
}

function DayDate({ date, checkIn }: { date: Date; checkIn: boolean }) {
  const dateTime = format(date, 'yyyy-MM-dd');
  if (!checkIn) return <time dateTime={dateTime}>{dayNumber(date)}</time>;
  return (
    <>
      <PositionBadge label={dayNumber(date)} size="xs" tone="check-in" dateTime={dateTime} />
      <span className="sr-only">, check-in form due</span>
    </>
  );
}

function kindOf(block: Block, day: BlockDay): DayKind {
  return block.calendar[day.weekday].kind;
}

function DayCell({ block, day }: { block: Block; day: BlockDay }) {
  const kind = kindOf(block, day);
  return (
    <td role="cell" className={cn(CELL_CLASS, { [BLOCK_SOFT[block.type]]: kind === 'session' })}>
      {kind !== 'rest' && (
        <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-[3px]', kind === 'session' ? BLOCK_SWATCH[block.type] : 'bg-training-recovery')} />
      )}
      <span className={cn(DOCUMENT_NOTE_CLASS, 'block min-h-5 font-semibold text-text-primary whitespace-nowrap tabular-nums max-sm:w-16 max-sm:shrink-0 print:h-[3.8mm] print:min-h-0 print:leading-[3.8mm]')}>
        <span aria-hidden="true" className="sm:hidden">{`${weekdayAbbreviation(day.weekday)} `}</span>
        {day.date && <DayDate date={day.date} checkIn={day.checkIn} />}
      </span>{' '}
      <span className={cn('block text-document-table leading-tight text-balance max-sm:flex-1 sm:mt-0.5 print:mt-0 print:leading-[1.1]', KIND_NAME[kind])}>{dayEntryLabel(block, day.weekday)}</span>
      {kind !== 'rest' && <span data-print-only className={cn(TICK_BOX_CLASS, 'absolute right-[0.5mm] bottom-[0.5mm]')} />}
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
      {range && <span className={cn(DOCUMENT_NOTE_CLASS, 'block whitespace-nowrap tabular-nums')}>{` ${range}`}</span>}
      {calibration && <span className={cn(DOCUMENT_NOTE_CLASS, 'block italic')}> Calibration</span>}
    </th>
  );
}

function weekdaysOf(weeks: readonly BlockWeek[]): Weekday[] {
  return weeks[0].days.map(day => day.weekday);
}

function checkInDates(weeks: readonly BlockWeek[]): Date[] {
  return weeks.flatMap(week => week.days.flatMap(day => (day.checkIn && day.date ? [day.date] : [])));
}

export function BlockCalendar({ view, block }: { view: ProgramView; block: Block }) {
  const { blocks } = view.version.content.plan;
  const weeks = blockWeeks({ blocks, dayOne: view.dayOne }, blocks.indexOf(block), view.preferredWeekday);
  const checkIns = checkInDates(weeks);
  return (
    <section aria-label={TITLE} data-print-keep className="space-y-document-tight">
      <DocumentHeading level={2} className={DOCUMENT_SECTION_TITLE_CLASS}>
        {TITLE}
      </DocumentHeading>
      <table role="table" aria-label={TITLE} className="w-full border-collapse max-sm:block sm:table-fixed">
        <thead role="rowgroup" className="max-sm:sr-only">
          <tr role="row">
            <td className="w-[14%]" />
            {weekdaysOf(weeks).map(weekday => (
              <th key={weekday} role="columnheader" scope="col" className={cn(DOCUMENT_HEAD_CLASS, 'px-2 pb-1 text-left print:pb-0.5')}>
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
      <p className={cn(DOCUMENT_NOTE_CLASS, 'flex flex-wrap items-center gap-x-5 gap-y-1')}>
        <span data-print-only className="inline-flex items-center gap-1.5">
          <span className={cn(TICK_BOX_CLASS, 'size-[3.5mm]')} />
          Tick each session once it’s done
        </span>
        {checkIns.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-check-in-marker" />
            {`Check-in form due · ${checkIns.map(date => format(date, 'EEE d MMM')).join(', ')}`}
          </span>
        )}
      </p>
    </section>
  );
}
