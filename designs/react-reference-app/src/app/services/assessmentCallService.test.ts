import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ASSESSMENT_CALL_DURATION_MINUTES,
  AssessmentCallError,
  bookAssessmentCall,
  DEFAULT_COACH_AVAILABILITY,
  listOpenSlots,
} from './assessmentCallService';

const bucharestWeekday = new Intl.DateTimeFormat('en-GB', {
  timeZone: DEFAULT_COACH_AVAILABILITY.timeZone,
  weekday: 'long',
});

function isoStarts(slots: Date[]): string[] {
  return slots.map((slot) => slot.toISOString());
}

describe('listOpenSlots', () => {
  it('opens one start an hour through the coach evening of a weekday', async () => {
    // arrange
    const now = new Date('2026-03-02T06:00:00.000Z');

    // act
    const slots = await listOpenSlots({ now, bookedStarts: [] });

    // assert
    expect(isoStarts(slots).slice(0, 3)).toEqual([
      '2026-03-02T15:00:00.000Z',
      '2026-03-02T16:00:00.000Z',
      '2026-03-02T17:00:00.000Z',
    ]);
  });

  it('leaves the weekend closed', async () => {
    // arrange
    const now = new Date('2026-03-02T06:00:00.000Z');

    // act
    const slots = await listOpenSlots({ now, bookedStarts: [] });

    // assert
    const weekdays = new Set(slots.map((slot) => bucharestWeekday.format(slot)));
    expect([...weekdays].sort()).toEqual([
      'Friday',
      'Monday',
      'Thursday',
      'Tuesday',
      'Wednesday',
    ]);
  });

  it('withholds the starts that fall inside the lead window', async () => {
    // arrange
    const now = new Date('2026-03-02T16:30:00.000Z');

    // act
    const slots = await listOpenSlots({ now, bookedStarts: [] });

    // assert
    expect(isoStarts(slots)[0]).toBe('2026-03-03T15:00:00.000Z');
  });

  it('withholds a start that is already booked', async () => {
    // arrange
    const now = new Date('2026-03-02T06:00:00.000Z');
    const bookedStarts = [new Date('2026-03-02T16:00:00.000Z')];

    // act
    const slots = await listOpenSlots({ now, bookedStarts });

    // assert
    expect(isoStarts(slots)).toContain('2026-03-02T15:00:00.000Z');
    expect(isoStarts(slots)).not.toContain('2026-03-02T16:00:00.000Z');
    expect(isoStarts(slots)).toContain('2026-03-02T17:00:00.000Z');
  });

  it('keeps the coach evening at 17:00 Bucharest across the October change', async () => {
    // arrange
    const now = new Date('2026-10-19T06:00:00.000Z');

    // act
    const slots = await listOpenSlots({ now, bookedStarts: [] });

    // assert
    expect(isoStarts(slots)).toContain('2026-10-23T14:00:00.000Z');
    expect(isoStarts(slots)).toContain('2026-10-26T15:00:00.000Z');
    expect(isoStarts(slots)).not.toContain('2026-10-26T14:00:00.000Z');
  });

  it('stops offering starts beyond the booking horizon', async () => {
    // arrange
    const now = new Date('2026-03-02T06:00:00.000Z');

    // act
    const slots = await listOpenSlots({ now, bookedStarts: [] });

    // assert
    const horizonEnd = new Date('2026-04-01T06:00:00.000Z');
    expect(slots.at(-1)!.getTime()).toBeLessThanOrEqual(horizonEnd.getTime());
    expect(slots.at(-1)!.getTime()).toBeGreaterThan(
      horizonEnd.getTime() - 4 * 24 * 60 * 60 * 1000,
    );
  });
});

describe('bookAssessmentCall', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const request = {
    startsAt: new Date('2026-03-02T15:00:00.000Z'),
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    notes: 'Recovering from a knee injury',
    visitorTimeZone: 'Europe/London',
  };

  it('confirms a call the visitor can join, in both time zones', async () => {
    // arrange
    const booking = bookAssessmentCall({ ...request, outcome: 'success' });

    // act
    await vi.advanceTimersByTimeAsync(1200);

    // assert
    const confirmed = await booking;
    expect(confirmed).toMatchObject({
      startsAt: request.startsAt,
      visitorName: 'Jane Doe',
      visitorEmail: 'jane@example.com',
      notes: 'Recovering from a knee injury',
      visitorTimeZone: 'Europe/London',
      coachTimeZone: DEFAULT_COACH_AVAILABILITY.timeZone,
    });
    expect(confirmed.joinPath).toBe(`/book/${confirmed.id}/join`);
    expect(ASSESSMENT_CALL_DURATION_MINUTES).toBe(30);
  });

  it.each([
    ['slot_unavailable', 'SLOT_UNAVAILABLE'],
    ['email_already_booked', 'EMAIL_ALREADY_BOOKED'],
    ['invalid_email', 'INVALID_EMAIL'],
    ['server_error', 'SERVER_ERROR'],
  ] as const)(
    'rejects with the %s code when that outcome is mocked',
    async (outcome, code) => {
      // arrange
      const booking = bookAssessmentCall({ ...request, outcome });
      const isDomainError = expect(booking).rejects.toBeInstanceOf(
        AssessmentCallError,
      );
      const carriesCode = expect(booking).rejects.toMatchObject({ code });

      // act
      await vi.advanceTimersByTimeAsync(1200);

      // assert
      await isDomainError;
      await carriesCode;
    },
  );

  it('attaches the call the visitor already holds when the email is taken', async () => {
    // arrange
    const booking = bookAssessmentCall({
      ...request,
      outcome: 'email_already_booked',
    });
    const carriesExisting = expect(booking).rejects.toMatchObject({
      existingBooking: {
        visitorEmail: 'jane@example.com',
        startsAt: request.startsAt,
      },
    });

    // act
    await vi.advanceTimersByTimeAsync(1200);

    // assert
    await carriesExisting;
  });
});
