export type OpenSlotsRequest = {
  from: string;
  durationMinutes: number;
  bufferMinutes: number;
  stepMinutes: number;
  horizonDays: number;
  leadMinutes: number;
};

export type OfferedStartRequest = OpenSlotsRequest & { startsAt: string };

type CoachWeek = {
  timeZone: string;
  weekdays: string[];
  hours: number[];
};

type BusyInterval = { startsAt: string; endsAt: string };

export interface OpenSlotsFacade {
  openStarts(request: OpenSlotsRequest): Promise<string[]>;
  offersStart(request: OfferedStartRequest): Promise<boolean>;
  coachWeek(): Promise<CoachWeek>;
  busyFrom(from: string): Promise<BusyInterval[]>;
}
