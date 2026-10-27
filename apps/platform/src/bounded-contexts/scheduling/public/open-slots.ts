export type OpenSlotsRequest = {
  from: string;
  to: string;
  durationMinutes: number;
  stepMinutes: number;
  leadTimeHours: number;
  bufferMinutes: number;
};

type OfferedStartRequest = OpenSlotsRequest & { startsAt: string };

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
