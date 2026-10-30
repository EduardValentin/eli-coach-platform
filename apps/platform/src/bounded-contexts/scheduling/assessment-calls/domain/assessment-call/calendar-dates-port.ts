export type CalendarDate = { year: number; month: number; day: number };

export interface CalendarDatesPort {
  dateOn(moment: { on: Date; timeZone: string }): CalendarDate;
  dateOf(isoDate: string): CalendarDate | null;
  yearsBetween(from: CalendarDate, to: CalendarDate): number;
}
