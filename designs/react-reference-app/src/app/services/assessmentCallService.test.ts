import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ASSESSMENT_CALL_DURATION_MINUTES,
  AssessmentCallError,
  bookAssessmentCall,
  DEFAULT_ASSESSMENT_CALL_SETTINGS,
  DEFAULT_COACH_AVAILABILITY,
  listOpenSlots,
  saveAssessmentCallSettings,
  validateAssessmentCallSettings,
  type AssessmentCallSettings,
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
    firstName: ' Jane ',
    lastName: 'Doe',
    email: 'jane@example.com',
    dateOfBirth: '1994-03-14',
    gender: 'female',
    primaryGoal: 'build_strength',
    country: 'RO',
    phone: '+40712345678',
    notes: 'Recovering from a knee injury',
    visitorTimeZone: 'Europe/London',
  } as const;

  it('confirms a call the visitor can join, in both time zones', async () => {
    // arrange
    const booking = bookAssessmentCall(
      { ...request, outcome: 'success' },
      DEFAULT_COACH_AVAILABILITY,
    );

    // act
    await vi.advanceTimersByTimeAsync(1200);

    // assert
    const confirmed = await booking;
    expect(confirmed).toMatchObject({
      startsAt: request.startsAt,
      firstName: 'Jane',
      lastName: 'Doe',
      visitorEmail: 'jane@example.com',
      dateOfBirth: '1994-03-14',
      gender: 'female',
      primaryGoal: 'build_strength',
      country: 'RO',
      phone: '+40712345678',
      notes: 'Recovering from a knee injury',
      visitorTimeZone: 'Europe/London',
      coachTimeZone: DEFAULT_COACH_AVAILABILITY.timeZone,
    });
    expect(confirmed.joinPath).toBe(`/book/${confirmed.id}/join`);
    expect(ASSESSMENT_CALL_DURATION_MINUTES).toBe(30);
  });

  it.each([
    'slot_unavailable',
    'booking_refused',
    'invalid_email',
    'server_error',
  ] as const)(
    'rejects with the %s code when that outcome is mocked',
    async (outcome) => {
      // arrange
      const booking = bookAssessmentCall(
        { ...request, outcome },
        DEFAULT_COACH_AVAILABILITY,
      );
      const isDomainError = expect(booking).rejects.toBeInstanceOf(
        AssessmentCallError,
      );
      const carriesCode = expect(booking).rejects.toMatchObject({
        code: outcome,
      });

      // act
      await vi.advanceTimersByTimeAsync(1200);

      // assert
      await isDomainError;
      await carriesCode;
    },
  );

  it('refuses a taken email without attaching anything about the other call', async () => {
    // arrange
    const booking = bookAssessmentCall(
      { ...request, outcome: 'booking_refused' },
      DEFAULT_COACH_AVAILABILITY,
    );
    const refusal = booking.catch((error: unknown) => error);

    // act
    await vi.advanceTimersByTimeAsync(1200);

    // assert
    const error = await refusal;
    expect(error).toBeInstanceOf(AssessmentCallError);
    expect(Object.keys(error as object)).not.toContain('existingBooking');
    expect((error as AssessmentCallError).message).toBe(
      "We couldn't book this call. Email us and we'll sort it out.",
    );
  });

  it('takes the coach zone from the availability passed in, not the default', async () => {
    // arrange
    const availability = {
      ...DEFAULT_COACH_AVAILABILITY,
      timeZone: 'America/New_York',
    };
    const booking = bookAssessmentCall(
      { ...request, outcome: 'success' },
      availability,
    );

    // act
    await vi.advanceTimersByTimeAsync(1200);

    // assert
    const confirmed = await booking;
    expect(confirmed.coachTimeZone).toBe('America/New_York');
  });
});

describe('validateAssessmentCallSettings', () => {
  const validSettings: AssessmentCallSettings = {
    ...DEFAULT_ASSESSMENT_CALL_SETTINGS,
    meetingLink: 'https://meet.google.com/abc-defg-hij',
  };

  it('accepts settings with a weekday, a valid window, and a valid link', () => {
    // arrange
    // act
    const problems = validateAssessmentCallSettings(validSettings);

    // assert
    expect(problems).toEqual([]);
  });

  it('accepts an empty meeting link', () => {
    // arrange
    const settings = { ...validSettings, meetingLink: null };

    // act
    const problems = validateAssessmentCallSettings(settings);

    // assert
    expect(problems).toEqual([]);
  });

  it('reports no_weekday when no day is picked', () => {
    // arrange
    const settings = { ...validSettings, weekdays: [] };

    // act
    const problems = validateAssessmentCallSettings(settings);

    // assert
    expect(problems).toContain('no_weekday');
  });

  it('reports invalid_hours when the start is not before the end', () => {
    // arrange
    const settings = { ...validSettings, startHour: 20, endHour: 20 };

    // act
    const problems = validateAssessmentCallSettings(settings);

    // assert
    expect(problems).toContain('invalid_hours');
  });

  it('reports invalid_meeting_link for a non-https link', () => {
    // arrange
    const settings = { ...validSettings, meetingLink: 'http://meet.google.com/abc' };

    // act
    const problems = validateAssessmentCallSettings(settings);

    // assert
    expect(problems).toContain('invalid_meeting_link');
  });

  it('reports invalid_meeting_link for a link over 2048 characters', () => {
    // arrange
    const settings = {
      ...validSettings,
      meetingLink: `https://meet.google.com/${'a'.repeat(2048)}`,
    };

    // act
    const problems = validateAssessmentCallSettings(settings);

    // assert
    expect(problems).toContain('invalid_meeting_link');
  });

  it('reports invalid_time_zone for a zone Intl cannot format', () => {
    // arrange
    const settings = { ...validSettings, timeZone: 'Not/A_Zone' };

    // act
    const problems = validateAssessmentCallSettings(settings);

    // assert
    expect(problems).toContain('invalid_time_zone');
  });

  it('reports every problem at once', () => {
    // arrange
    const settings = {
      timeZone: 'Not/A_Zone',
      weekdays: [],
      startHour: 20,
      endHour: 20,
      meetingLink: 'ftp://not-https.example.com',
    };

    // act
    const problems = validateAssessmentCallSettings(settings);

    // assert
    expect(problems.sort()).toEqual(
      [
        'no_weekday',
        'invalid_hours',
        'invalid_meeting_link',
        'invalid_time_zone',
      ].sort(),
    );
  });
});

describe('saveAssessmentCallSettings', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const settings: AssessmentCallSettings = {
    ...DEFAULT_ASSESSMENT_CALL_SETTINGS,
    meetingLink: 'https://meet.google.com/abc-defg-hij',
  };

  it('resolves with the saved settings after the simulated latency', async () => {
    // arrange
    const saved = saveAssessmentCallSettings({ settings, outcome: 'saved' });

    // act
    await vi.advanceTimersByTimeAsync(1200);

    // assert
    expect(await saved).toEqual(settings);
  });

  it('throws a server_error AssessmentCallError on the server_error outcome', async () => {
    // arrange
    const saved = saveAssessmentCallSettings({
      settings,
      outcome: 'server_error',
    });
    const refusal = saved.catch((error: unknown) => error);

    // act
    await vi.advanceTimersByTimeAsync(1200);

    // assert
    const error = await refusal;
    expect(error).toBeInstanceOf(AssessmentCallError);
    expect((error as AssessmentCallError).code).toBe('server_error');
    expect((error as AssessmentCallError).message).toBe(
      "We couldn't save your settings. Try again in a moment.",
    );
  });
});
