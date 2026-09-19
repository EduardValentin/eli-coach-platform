export type PrototypeBookingOutcome =
  | 'success'
  | 'slot_unavailable'
  | 'booking_refused'
  | 'invalid_email'
  | 'server_error';

export type AssessmentCallErrorCode = Exclude<
  PrototypeBookingOutcome,
  'success'
>;

export type PrototypeBooking = {
  id: string;
  startsAt: Date;
  visitorName: string;
  visitorEmail: string;
  notes: string;
  visitorTimeZone: string;
  coachTimeZone: string;
  joinPath: string;
};

export class AssessmentCallError extends Error {
  code: AssessmentCallErrorCode;

  constructor(code: AssessmentCallErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'AssessmentCallError';
  }
}

export const ASSESSMENT_CALL_ERROR_MESSAGES: Record<
  AssessmentCallErrorCode,
  string
> = {
  slot_unavailable:
    'That time was taken while you were filling in your details. Pick another one — your details are saved.',
  booking_refused:
    "We couldn't book this call. Email us and we'll sort it out.",
  invalid_email:
    "That email address doesn't look right. Check it and try again.",
  server_error: 'Something went wrong on our end. Please try again.',
};

export const SIMULATED_LATENCY_MS = 1200;

export const ASSESSMENT_CALL_DURATION_MINUTES = 30;
export const ASSESSMENT_CALL_BUFFER_MINUTES = 30;
export const SLOT_STEP_MINUTES = 60;
export const BOOKING_HORIZON_DAYS = 30;
export const BOOKING_LEAD_MINUTES = 120;

export type CoachAvailability = {
  timeZone: string;
  weekdays: number[];
  startHour: number;
  endHour: number;
};

export const DEFAULT_COACH_AVAILABILITY: CoachAvailability = {
  timeZone: 'Europe/Bucharest',
  weekdays: [1, 2, 3, 4, 5],
  startHour: 17,
  endHour: 20,
};

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

type CivilDate = { year: number; month: number; day: number };

function zoneParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const { year, month, day, hour, minute, second } = zoneParts(
    instant,
    timeZone,
  );
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - instant.getTime() + (instant.getTime() % 1000);
}

function civilDateOf(instant: Date, timeZone: string): CivilDate {
  const { year, month, day } = zoneParts(instant, timeZone);
  return { year, month, day };
}

function addDays({ year, month, day }: CivilDate, days: number): CivilDate {
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function weekdayOf({ year, month, day }: CivilDate): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function instantAt(
  { year, month, day }: CivilDate,
  hour: number,
  timeZone: string,
): Date {
  const asUtc = Date.UTC(year, month - 1, day, hour);
  const firstGuess = new Date(asUtc - zoneOffsetMs(new Date(asUtc), timeZone));
  const refinedOffset = zoneOffsetMs(firstGuess, timeZone);
  return new Date(asUtc - refinedOffset);
}

function startHours({ startHour, endHour }: CoachAvailability): number[] {
  const step = SLOT_STEP_MINUTES / 60;
  const hours: number[] = [];
  for (let hour = startHour; hour + step <= endHour; hour += step) {
    hours.push(hour);
  }
  return hours;
}

export type OpenSlotsRequest = {
  now: Date;
  bookedStarts: Date[];
  availability?: CoachAvailability;
};

export async function listOpenSlots({
  now,
  bookedStarts,
  availability = DEFAULT_COACH_AVAILABILITY,
}: OpenSlotsRequest): Promise<Date[]> {
  const earliest = now.getTime() + BOOKING_LEAD_MINUTES * MINUTE_MS;
  const latest = now.getTime() + BOOKING_HORIZON_DAYS * DAY_MS;
  const taken = new Set(bookedStarts.map((start) => start.getTime()));
  const hours = startHours(availability);
  const firstDay = civilDateOf(now, availability.timeZone);

  const slots: Date[] = [];
  for (let offset = 0; offset <= BOOKING_HORIZON_DAYS; offset += 1) {
    const day = addDays(firstDay, offset);
    if (!availability.weekdays.includes(weekdayOf(day))) continue;

    for (const hour of hours) {
      const start = instantAt(day, hour, availability.timeZone);
      const time = start.getTime();
      if (time < earliest || time > latest || taken.has(time)) continue;
      slots.push(start);
    }
  }

  return slots;
}

export type AssessmentCallRequest = {
  startsAt: Date;
  fullName: string;
  email: string;
  notes: string;
  visitorTimeZone: string;
  outcome: PrototypeBookingOutcome;
};

function bookingId(): string {
  return `ac-${Math.random().toString(36).slice(2, 10)}`;
}

function bookingFrom(request: AssessmentCallRequest): PrototypeBooking {
  const id = bookingId();
  return {
    id,
    startsAt: request.startsAt,
    visitorName: request.fullName.trim(),
    visitorEmail: request.email.trim(),
    notes: request.notes.trim(),
    visitorTimeZone: request.visitorTimeZone,
    coachTimeZone: DEFAULT_COACH_AVAILABILITY.timeZone,
    joinPath: `/book/${id}/join`,
  };
}

export async function bookAssessmentCall(
  request: AssessmentCallRequest,
): Promise<PrototypeBooking> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (request.outcome !== 'success') {
    throw new AssessmentCallError(
      request.outcome,
      ASSESSMENT_CALL_ERROR_MESSAGES[request.outcome],
    );
  }

  return bookingFrom(request);
}
