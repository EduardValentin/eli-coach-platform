export type CalendarDate = { year: number; month: number; day: number };

export interface CalendarDates {
  dateOn(moment: { on: Date; timeZone: string }): CalendarDate;
}
