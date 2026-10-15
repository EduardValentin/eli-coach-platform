import { describe, expect, it } from 'vitest';
import {
  BELL_RULES,
  describeNotification,
  latestInBell,
  timeAgo,
  unreadInBell,
  type BellNotification,
  type CheckinMomentKind,
  type NotificationEvent,
  type NotificationReading,
} from './notifications';

const ZONE = 'Europe/Bucharest';
const COACH: NotificationReading = { party: 'coach', timeZone: ZONE };
const CLIENT: NotificationReading = { party: 'client', timeZone: ZONE };
const FRIDAY_AT_SIX = '2026-10-16T15:00:00.000Z';
const NOW = new Date('2026-10-15T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function moment(kind: CheckinMomentKind, clientName?: string): NotificationEvent {
  return { kind, facts: { checkInId: 'ck 1', startsAt: FRIDAY_AT_SIX, clientName } };
}

function notification(id: string, arrivedAt: Date, readAt: Date | null = null): BellNotification {
  return { ...moment('check-in.requested', 'Jane Doe'), id, arrivedAt, readAt };
}

describe('the words of a check-in notification', () => {
  it.each<[CheckinMomentKind, string, string]>([
    ['check-in.requested', 'Check-in requested', 'Jane Doe asked for a check-in on Fri, Oct 16 at 6:00 PM.'],
    ['check-in.withdrawn', 'Check-in request withdrawn', 'Jane Doe withdrew the check-in on Fri, Oct 16 at 6:00 PM.'],
    ['check-in.approved', 'Check-in approved', 'Jane Doe approved the check-in on Fri, Oct 16 at 6:00 PM.'],
    ['check-in.declined', 'Check-in declined', 'Jane Doe declined the check-in on Fri, Oct 16 at 6:00 PM.'],
    ['check-in.new-time-proposed', 'New time proposed', 'Jane Doe proposed Fri, Oct 16 at 6:00 PM instead.'],
    ['check-in.new-time-accepted', 'New time accepted', 'Jane Doe accepted the check-in on Fri, Oct 16 at 6:00 PM.'],
    ['check-in.new-time-declined', 'New time declined', 'Jane Doe declined the new time, Fri, Oct 16 at 6:00 PM.'],
    ['check-in.cancelled', 'Check-in cancelled', 'Jane Doe cancelled the check-in on Fri, Oct 16 at 6:00 PM.'],
    [
      'check-in.request-expired',
      'Check-in request expired',
      "Jane Doe's check-in on Fri, Oct 16 at 6:00 PM was not answered in time.",
    ],
    [
      'check-in.new-time-expired',
      'New time expired',
      "Jane Doe's new time, Fri, Oct 16 at 6:00 PM, was not answered in time.",
    ],
    [
      'check-in.clash-missed',
      'Weekly check-in missed',
      "No new time was found for Jane Doe's check-in on Fri, Oct 16 at 6:00 PM.",
    ],
  ])('names the client to the coach for %s', (kind, title, line) => {
    // arrange
    const event = moment(kind, 'Jane Doe');

    // act
    const described = describeNotification(event, COACH);

    // assert
    expect(described).toEqual({ title, line, href: '/coach/checkins?checkin=ck%201' });
  });

  it.each<[CheckinMomentKind, string]>([
    ['check-in.requested', 'Eli asked for a check-in on Fri, Oct 16 at 6:00 PM.'],
    ['check-in.approved', 'Eli approved the check-in on Fri, Oct 16 at 6:00 PM.'],
    ['check-in.new-time-proposed', 'Eli proposed Fri, Oct 16 at 6:00 PM instead.'],
    ['check-in.request-expired', 'The check-in on Fri, Oct 16 at 6:00 PM was not answered in time.'],
    ['check-in.new-time-expired', 'The new time, Fri, Oct 16 at 6:00 PM, was not answered in time.'],
    ['check-in.clash-missed', 'No new time was found for the check-in on Fri, Oct 16 at 6:00 PM.'],
  ])('names her coach to the client for %s', (kind, line) => {
    // arrange
    const event = moment(kind);

    // act
    const described = describeNotification(event, CLIENT);

    // assert
    expect(described.line).toBe(line);
    expect(described.href).toBe('/portal/checkins?checkin=ck%201');
  });

  it('writes the time in the reader’s zone', () => {
    // arrange
    const event = moment('check-in.requested', 'Jane Doe');

    // act
    const described = describeNotification(event, { party: 'coach', timeZone: 'America/New_York' });

    // assert
    expect(described.line).toBe('Jane Doe asked for a check-in on Fri, Oct 16 at 11:00 AM.');
  });
});

describe('the words of a weekly check-in notification', () => {
  const firstWeek = { firstWeekId: 'ck-w1', firstWeekStartsAt: '2026-10-22T15:00:00.000Z' };

  it('tells her the weekly check-in she now has and opens its first week', () => {
    // arrange
    const event: NotificationEvent = { kind: 'check-in.series-set-up', facts: firstWeek };

    // act
    const described = describeNotification(event, CLIENT);

    // assert
    expect(described).toEqual({
      title: 'Weekly check-in set up',
      line: 'Every Thursday at 6:00 PM, from Oct 22.',
      href: '/portal/checkins?checkin=ck-w1',
    });
  });

  it('tells her the new weekly time and opens the next week', () => {
    // arrange
    const event: NotificationEvent = { kind: 'check-in.series-changed', facts: firstWeek };

    // act
    const described = describeNotification(event, CLIENT);

    // assert
    expect(described).toEqual({
      title: 'Weekly check-in changed',
      line: 'Now every Thursday at 6:00 PM, from Oct 22.',
      href: '/portal/checkins?checkin=ck-w1',
    });
  });

  it('tells her the weekly check-in stopped and opens her check-ins', () => {
    // arrange
    const event: NotificationEvent = { kind: 'check-in.series-stopped', facts: {} };

    // act
    const described = describeNotification(event, CLIENT);

    // assert
    expect(described).toEqual({
      title: 'Weekly check-in stopped',
      line: 'Eli stopped your weekly check-in.',
      href: '/portal/checkins',
    });
  });

  it.each([
    [1, 'Weekly check-in clashes', "Jane Doe's new week falls on a taken hour."],
    [3, '3 weekly check-ins clash', "Jane Doe's new weeks fall on a taken hour."],
  ])('tells the coach %i renewed week(s) clash and opens the earliest', (clashes, title, line) => {
    // arrange
    const event: NotificationEvent = {
      kind: 'check-in.series-clashes',
      facts: { clientName: 'Jane Doe', clashes, earliestId: 'ck-w9', earliestStartsAt: FRIDAY_AT_SIX },
    };

    // act
    const described = describeNotification(event, COACH);

    // assert
    expect(described).toEqual({ title, line, href: '/coach/checkins?checkin=ck-w9' });
  });
});

describe('how long ago a notification arrived', () => {
  it.each([
    [30 * 1000, 'Just now'],
    [5 * 60 * 1000, '5 min ago'],
    [2 * HOUR_MS + 59 * 60 * 1000, '2 h ago'],
    [DAY_MS, '1 day ago'],
    [3 * DAY_MS + HOUR_MS, '3 days ago'],
    [-HOUR_MS, 'Just now'],
  ])('words %i ms as %s', (elapsed, words) => {
    // arrange
    const arrivedAt = new Date(NOW.getTime() - elapsed);

    // act
    const ago = timeAgo(arrivedAt, NOW);

    // assert
    expect(ago).toBe(words);
  });
});

describe('what the bell holds', () => {
  it('lists the latest thirty, newest first', () => {
    // arrange
    const notifications = Array.from({ length: BELL_RULES.latest + 5 }, (_, index) =>
      notification(`n${index}`, new Date(NOW.getTime() - (BELL_RULES.latest + 5 - index) * HOUR_MS)),
    );

    // act
    const latest = latestInBell(notifications, NOW);

    // assert
    expect(latest).toHaveLength(BELL_RULES.latest);
    expect(latest[0].id).toBe(`n${BELL_RULES.latest + 4}`);
    expect(latest.at(-1)?.id).toBe('n5');
  });

  it('leaves out notifications older than ninety days, also from the unread count', () => {
    // arrange
    const notifications = [
      notification('recent', new Date(NOW.getTime() - DAY_MS)),
      notification('old', new Date(NOW.getTime() - (BELL_RULES.windowDays + 1) * DAY_MS)),
      notification('read', new Date(NOW.getTime() - HOUR_MS), NOW),
    ];

    // act
    const latest = latestInBell(notifications, NOW);
    const unread = unreadInBell(notifications, NOW);

    // assert
    expect(latest.map((entry) => entry.id)).toEqual(['read', 'recent']);
    expect(unread).toBe(1);
  });
});
