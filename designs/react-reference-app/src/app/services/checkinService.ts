import { TZDate } from '@date-fns/tz';
import {
  CHECKIN_DURATION_MINUTES,
  heldCheckinSpan,
  spansOverlap,
  timeSpanFrom,
  type CheckinStatus,
  type TimeSpan,
} from '../domain/checkins';
import {
  ASSESSMENT_CALL_BUFFER_MINUTES,
  ASSESSMENT_CALL_DURATION_MINUTES,
  type CoachAvailability,
} from './assessmentCallService';

export const CHECKIN_SERVICE_OUTCOMES = ['works', 'time-taken', 'cannot-answer', 'fails'] as const;
export type CheckinServiceOutcome = (typeof CHECKIN_SERVICE_OUTCOMES)[number];

export const CHECKIN_SERVICE_LATENCY_MS = 600;
export const CHECKIN_NOTICE_MINUTES = 24 * 60;
export const CHECKIN_HORIZON_DAYS = 30;

export const OPEN_TIMES_UNAVAILABLE = "We couldn't load the open times just now.";
export const CHECKIN_SERVICE_FAILED = 'The check-in service did not answer.';

export type CheckinSchedule = {
  now: Date;
  availability: CoachAvailability;
  callStarts: readonly Date[];
  heldCheckinStarts: readonly Date[];
};

export type CheckinRequestDecision = 'requested' | 'request_waiting' | 'time_taken';

export type CheckinScheduleDecision = 'scheduled' | 'client_cannot_answer' | 'time_taken';

export type CheckinSettlement = 'settled' | 'not_pending';

export type CheckinTimeRequest = {
  startsAt: Date;
  schedule: CheckinSchedule;
  waitingRequest: boolean;
};

export type CheckinTimeSchedule = {
  startsAt: Date;
  schedule: CheckinSchedule;
};

export type PendingRequestAnswer = { status: CheckinStatus };

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const CALL_OCCUPIES_MINUTES = ASSESSMENT_CALL_DURATION_MINUTES + ASSESSMENT_CALL_BUFFER_MINUTES;

function busySpans({ callStarts, heldCheckinStarts }: CheckinSchedule): TimeSpan[] {
  return [
    ...callStarts.map((start) => timeSpanFrom(start, CALL_OCCUPIES_MINUTES)),
    ...heldCheckinStarts.map(heldCheckinSpan),
  ];
}

function windowStartHours({ startHour, endHour }: CoachAvailability): number[] {
  const lastStartHour = endHour - CHECKIN_DURATION_MINUTES / 60;
  const hours: number[] = [];
  for (let hour = startHour; hour <= lastStartHour; hour += 1) hours.push(hour);

  return hours;
}

export function openCheckinTimes(schedule: CheckinSchedule): Date[] {
  const { now, availability } = schedule;
  const earliest = now.getTime() + CHECKIN_NOTICE_MINUTES * MINUTE_MS;
  const latest = now.getTime() + CHECKIN_HORIZON_DAYS * DAY_MS;
  const busy = busySpans(schedule);
  const hours = windowStartHours(availability);
  const today = new TZDate(now, availability.timeZone);

  const times: Date[] = [];
  for (let offset = 0; offset <= CHECKIN_HORIZON_DAYS; offset += 1) {
    const day = new TZDate(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + offset,
      availability.timeZone,
    );
    if (!availability.weekdays.includes(day.getDay())) continue;

    for (const hour of hours) {
      const start = new TZDate(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        hour,
        availability.timeZone,
      );
      const time = start.getTime();
      const slot = heldCheckinSpan(start);
      if (time < earliest || time > latest) continue;
      if (busy.some((span) => spansOverlap(span, slot))) continue;
      times.push(new Date(time));
    }
  }

  return times;
}

function answerAfterLatency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, CHECKIN_SERVICE_LATENCY_MS));
}

function isOpenTime(startsAt: Date, schedule: CheckinSchedule): boolean {
  return openCheckinTimes(schedule).some((time) => time.getTime() === startsAt.getTime());
}

export async function listOpenCheckinTimes(
  schedule: CheckinSchedule,
  outcome: CheckinServiceOutcome,
): Promise<Date[]> {
  await answerAfterLatency();
  if (outcome === 'fails') throw new Error(OPEN_TIMES_UNAVAILABLE);

  return openCheckinTimes(schedule);
}

export async function requestCheckinTime(
  { startsAt, schedule, waitingRequest }: CheckinTimeRequest,
  outcome: CheckinServiceOutcome,
): Promise<CheckinRequestDecision> {
  await answerAfterLatency();
  if (outcome === 'fails') throw new Error(CHECKIN_SERVICE_FAILED);
  if (waitingRequest) return 'request_waiting';
  if (outcome === 'time-taken' || !isOpenTime(startsAt, schedule)) return 'time_taken';

  return 'requested';
}

export async function scheduleCheckinTime(
  { startsAt, schedule }: CheckinTimeSchedule,
  outcome: CheckinServiceOutcome,
): Promise<CheckinScheduleDecision> {
  await answerAfterLatency();
  if (outcome === 'fails') throw new Error(CHECKIN_SERVICE_FAILED);
  if (outcome === 'cannot-answer') return 'client_cannot_answer';
  if (outcome === 'time-taken' || !isOpenTime(startsAt, schedule)) return 'time_taken';

  return 'scheduled';
}

async function settlePendingRequest(
  { status }: PendingRequestAnswer,
  outcome: CheckinServiceOutcome,
): Promise<CheckinSettlement> {
  await answerAfterLatency();
  if (outcome === 'fails') throw new Error(CHECKIN_SERVICE_FAILED);

  return status === 'pending' ? 'settled' : 'not_pending';
}

export function answerCheckinRequest(
  answer: PendingRequestAnswer,
  outcome: CheckinServiceOutcome,
): Promise<CheckinSettlement> {
  return settlePendingRequest(answer, outcome);
}

export function withdrawCheckinRequest(
  withdrawal: PendingRequestAnswer,
  outcome: CheckinServiceOutcome,
): Promise<CheckinSettlement> {
  return settlePendingRequest(withdrawal, outcome);
}
