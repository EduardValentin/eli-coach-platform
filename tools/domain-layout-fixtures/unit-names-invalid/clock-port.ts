export interface ClockPort {
  now(): Date;
}

export interface CalendarPort {
  today(): string;
}
