export type ClockReading = { at: Date };

export interface ClockPort {
  now(): Date;
}
