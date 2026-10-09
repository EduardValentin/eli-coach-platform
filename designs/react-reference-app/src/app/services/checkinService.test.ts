import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHECKIN_SERVICE_LATENCY_MS,
  answerCheckinRequest,
  listOpenCheckinTimes,
  openCheckinTimes,
  requestCheckinTime,
  withdrawCheckinRequest,
  type CheckinSchedule,
} from './checkinService';

const BUCHAREST_EVENINGS = {
  timeZone: 'Europe/Bucharest',
  weekdays: [1, 2, 3, 4, 5],
  startHour: 17,
  endHour: 20,
};

const MONDAY_MORNING = new Date('2026-10-12T07:00:00.000Z');

const bucharestWeekday = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUCHAREST_EVENINGS.timeZone,
  weekday: 'long',
});

function scheduleAt(now: Date, held: Partial<CheckinSchedule> = {}): CheckinSchedule {
  return {
    now,
    availability: BUCHAREST_EVENINGS,
    callStarts: [],
    heldCheckinStarts: [],
    ...held,
  };
}

function isoStarts(times: Date[]): string[] {
  return times.map((time) => time.toISOString());
}

describe('openCheckinTimes', () => {
  it('offers one start an hour inside the coach window, ending an hour before it closes', () => {
    // arrange
    const schedule = scheduleAt(MONDAY_MORNING);

    // act
    const times = openCheckinTimes(schedule);

    // assert
    expect(isoStarts(times).slice(0, 4)).toEqual([
      '2026-10-13T14:00:00.000Z',
      '2026-10-13T15:00:00.000Z',
      '2026-10-13T16:00:00.000Z',
      '2026-10-14T14:00:00.000Z',
    ]);
  });

  it('withholds every start less than 24 hours away', () => {
    // arrange
    const schedule = scheduleAt(new Date('2026-10-12T14:00:00.000Z'));

    // act
    const times = openCheckinTimes(schedule);

    // assert
    expect(isoStarts(times)[0]).toBe('2026-10-13T14:00:00.000Z');
  });

  it('withholds a start that falls a minute inside the 24 hours', () => {
    // arrange
    const schedule = scheduleAt(new Date('2026-10-12T14:01:00.000Z'));

    // act
    const times = openCheckinTimes(schedule);

    // assert
    expect(isoStarts(times)[0]).toBe('2026-10-13T15:00:00.000Z');
  });

  it('keeps the days outside the coach weekdays closed', () => {
    // arrange
    const schedule = scheduleAt(MONDAY_MORNING);

    // act
    const times = openCheckinTimes(schedule);

    // assert
    const weekdays = new Set(times.map((time) => bucharestWeekday.format(time)));
    expect([...weekdays].sort()).toEqual(['Friday', 'Monday', 'Thursday', 'Tuesday', 'Wednesday']);
  });

  it('gives a booked assessment call its whole hour', () => {
    // arrange
    const schedule = scheduleAt(MONDAY_MORNING, {
      callStarts: [new Date('2026-10-13T14:00:00.000Z')],
    });

    // act
    const times = openCheckinTimes(schedule);

    // assert
    expect(isoStarts(times).slice(0, 2)).toEqual([
      '2026-10-13T15:00:00.000Z',
      '2026-10-13T16:00:00.000Z',
    ]);
  });

  it('gives a held check-in its hour', () => {
    // arrange
    const schedule = scheduleAt(MONDAY_MORNING, {
      heldCheckinStarts: [new Date('2026-10-13T15:00:00.000Z')],
    });

    // act
    const times = openCheckinTimes(schedule);

    // assert
    expect(isoStarts(times).slice(0, 2)).toEqual([
      '2026-10-13T14:00:00.000Z',
      '2026-10-13T16:00:00.000Z',
    ]);
  });

  it('closes a start that a held hour overlaps only in part', () => {
    // arrange
    const schedule = scheduleAt(MONDAY_MORNING, {
      heldCheckinStarts: [new Date('2026-10-13T14:30:00.000Z')],
    });

    // act
    const times = openCheckinTimes(schedule);

    // assert
    expect(isoStarts(times)[0]).toBe('2026-10-13T16:00:00.000Z');
  });

  it('offers nothing past 30 days from now', () => {
    // arrange
    const schedule = scheduleAt(MONDAY_MORNING);

    // act
    const times = openCheckinTimes(schedule);

    // assert
    expect(times.at(-1)?.toISOString()).toBe('2026-11-10T17:00:00.000Z');
  });
});

describe('the check-in service', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function settled<Answer>(call: Promise<Answer>): Promise<Answer> {
    const answer = call.then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    await vi.advanceTimersByTimeAsync(CHECKIN_SERVICE_LATENCY_MS);
    const outcome = await answer;
    if ('error' in outcome) throw outcome.error;

    return outcome.value;
  }

  it('lists the open times after a moment', async () => {
    // arrange
    const schedule = scheduleAt(MONDAY_MORNING);

    // act
    const times = await settled(listOpenCheckinTimes(schedule, 'works'));

    // assert
    expect(times).toEqual(openCheckinTimes(schedule));
  });

  it('fails to list the open times when the service fails', async () => {
    // arrange
    const schedule = scheduleAt(MONDAY_MORNING);

    // act
    const listing = settled(listOpenCheckinTimes(schedule, 'fails'));

    // assert
    await expect(listing).rejects.toThrow("We couldn't load the open times just now.");
  });

  it('requests an open time', async () => {
    // arrange
    const request = {
      startsAt: new Date('2026-10-13T14:00:00.000Z'),
      schedule: scheduleAt(MONDAY_MORNING),
      waitingRequest: false,
    };

    // act
    const decision = await settled(requestCheckinTime(request, 'works'));

    // assert
    expect(decision).toBe('requested');
  });

  it('answers taken for a time that is no longer open', async () => {
    // arrange
    const request = {
      startsAt: new Date('2026-10-13T14:00:00.000Z'),
      schedule: scheduleAt(MONDAY_MORNING, {
        callStarts: [new Date('2026-10-13T14:00:00.000Z')],
      }),
      waitingRequest: false,
    };

    // act
    const decision = await settled(requestCheckinTime(request, 'works'));

    // assert
    expect(decision).toBe('time_taken');
  });

  it('answers taken whenever the service is told the time was taken', async () => {
    // arrange
    const request = {
      startsAt: new Date('2026-10-13T14:00:00.000Z'),
      schedule: scheduleAt(MONDAY_MORNING),
      waitingRequest: false,
    };

    // act
    const decision = await settled(requestCheckinTime(request, 'time-taken'));

    // assert
    expect(decision).toBe('time_taken');
  });

  it('refuses a second request while one is waiting', async () => {
    // arrange
    const request = {
      startsAt: new Date('2026-10-13T14:00:00.000Z'),
      schedule: scheduleAt(MONDAY_MORNING),
      waitingRequest: true,
    };

    // act
    const decision = await settled(requestCheckinTime(request, 'works'));

    // assert
    expect(decision).toBe('request_waiting');
  });

  it('fails a request when the service fails', async () => {
    // arrange
    const request = {
      startsAt: new Date('2026-10-13T14:00:00.000Z'),
      schedule: scheduleAt(MONDAY_MORNING),
      waitingRequest: false,
    };

    // act
    const requesting = settled(requestCheckinTime(request, 'fails'));

    // assert
    await expect(requesting).rejects.toThrow('The check-in service did not answer.');
  });

  it('settles an answer to a pending request', async () => {
    // arrange
    const answer = { status: 'pending' as const };

    // act
    const settlement = await settled(answerCheckinRequest(answer, 'works'));

    // assert
    expect(settlement).toBe('settled');
  });

  it('refuses an answer to a request that is no longer pending', async () => {
    // arrange
    const answer = { status: 'cancelled' as const };

    // act
    const settlement = await settled(answerCheckinRequest(answer, 'works'));

    // assert
    expect(settlement).toBe('not_pending');
  });

  it('settles a withdrawal of a pending request', async () => {
    // arrange
    const withdrawal = { status: 'pending' as const };

    // act
    const settlement = await settled(withdrawCheckinRequest(withdrawal, 'works'));

    // assert
    expect(settlement).toBe('settled');
  });

  it('fails a withdrawal when the service fails', async () => {
    // arrange
    const withdrawal = { status: 'pending' as const };

    // act
    const withdrawing = settled(withdrawCheckinRequest(withdrawal, 'fails'));

    // assert
    await expect(withdrawing).rejects.toThrow('The check-in service did not answer.');
  });
});
