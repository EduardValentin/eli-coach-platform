import { COACH_DISPLAY_NAME } from '@content/index';
import {
  CLIENT_CHECKINS_PATH,
  clientCheckinPath,
  coachCheckinPath,
} from '../utils/checkinLinks';
import { formatShortDay, formatSlotTime } from '../utils/dateFormatters';
import { PROGRAM_READY_NOTIFICATION } from '../utils/reviewCallListing';

export type NotificationParty = 'coach' | 'client';

export type NotificationRecipient =
  | { party: 'coach' }
  | { party: 'client'; clientId: string };

export type CheckinMomentKind =
  | 'check-in.requested'
  | 'check-in.withdrawn'
  | 'check-in.approved'
  | 'check-in.declined'
  | 'check-in.new-time-proposed'
  | 'check-in.new-time-accepted'
  | 'check-in.new-time-declined'
  | 'check-in.cancelled'
  | 'check-in.request-expired'
  | 'check-in.new-time-expired'
  | 'check-in.clash-missed';

export type CheckinMomentFacts = {
  checkInId: string;
  startsAt: string;
  clientName?: string;
};

export type SeriesWeekFacts = { firstWeekId: string; firstWeekStartsAt: string };

export type SeriesClashFacts = {
  clientName: string;
  clashes: number;
  earliestId: string;
  earliestStartsAt: string;
};

export type MessageFacts = { senderName: string; text: string; clientId: string };

export type NotificationEvent =
  | { kind: CheckinMomentKind; facts: CheckinMomentFacts }
  | { kind: 'check-in.series-set-up' | 'check-in.series-changed'; facts: SeriesWeekFacts }
  | { kind: 'check-in.series-stopped'; facts: Record<string, never> }
  | { kind: 'check-in.series-clashes'; facts: SeriesClashFacts }
  | { kind: 'message.received'; facts: MessageFacts }
  | { kind: 'program.ready'; facts: Record<string, never> };

export type NotificationKind = NotificationEvent['kind'];

export type BellNotification = NotificationEvent & {
  id: string;
  arrivedAt: Date;
  readAt: Date | null;
};

export type NotificationReading = { party: NotificationParty; timeZone: string };

export type DescribedNotification = { title: string; line: string; href: string };

export const BELL_RULES = { latest: 30, windowDays: 90 } as const;

const POST_MVP_KINDS: readonly NotificationKind[] = ['message.received', 'program.ready'];

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function recipientKey(recipient: NotificationRecipient): string {
  return recipient.party === 'coach' ? 'coach' : `client:${recipient.clientId}`;
}

export function isPostMvpNotification(notification: NotificationEvent): boolean {
  return POST_MVP_KINDS.includes(notification.kind);
}

export function isUnread(notification: BellNotification): boolean {
  return notification.readAt === null;
}

function byNewestFirst(first: BellNotification, second: BellNotification): number {
  return second.arrivedAt.getTime() - first.arrivedAt.getTime();
}

export function withinBellWindow(notifications: readonly BellNotification[], now: Date): BellNotification[] {
  const since = now.getTime() - BELL_RULES.windowDays * DAY_MS;

  return notifications.filter((notification) => notification.arrivedAt.getTime() >= since);
}

export function latestInBell(notifications: readonly BellNotification[], now: Date): BellNotification[] {
  return withinBellWindow(notifications, now).sort(byNewestFirst).slice(0, BELL_RULES.latest);
}

export function unreadInBell(notifications: readonly BellNotification[], now: Date): number {
  return withinBellWindow(notifications, now).filter(isUnread).length;
}

export function timeAgo(arrivedAt: Date, now: Date): string {
  const elapsed = now.getTime() - arrivedAt.getTime();
  if (elapsed < MINUTE_MS) return 'Just now';
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} min ago`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)} h ago`;

  const days = Math.floor(elapsed / DAY_MS);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

function momentOf(startsAt: string, timeZone: string): string {
  const instant = new Date(startsAt);

  return `${formatShortDay(instant, timeZone)} at ${formatSlotTime(instant, timeZone)}`;
}

function weeklyRuleOf(startsAt: string, timeZone: string): string {
  const instant = new Date(startsAt);
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone }).format(instant);
  const from = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone }).format(instant);

  return `every ${weekday} at ${formatSlotTime(instant, timeZone)}, from ${from}`;
}

function otherPartyName(facts: CheckinMomentFacts, reading: NotificationReading): string {
  return reading.party === 'coach' ? (facts.clientName ?? 'Your client') : COACH_DISPLAY_NAME;
}

function theCheckinOf(facts: CheckinMomentFacts, reading: NotificationReading): string {
  return reading.party === 'coach' && facts.clientName ? `${facts.clientName}'s check-in` : 'the check-in';
}

function capitalised(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function momentCopy(
  kind: CheckinMomentKind,
  facts: CheckinMomentFacts,
  reading: NotificationReading,
): { title: string; line: string } {
  const name = otherPartyName(facts, reading);
  const when = momentOf(facts.startsAt, reading.timeZone);
  const theCheckin = theCheckinOf(facts, reading);
  const theNewTime = reading.party === 'coach' && facts.clientName ? `${facts.clientName}'s new time` : 'the new time';
  const copy: Record<CheckinMomentKind, { title: string; line: string }> = {
    'check-in.requested': { title: 'Check-in requested', line: `${name} asked for a check-in on ${when}.` },
    'check-in.withdrawn': { title: 'Check-in request withdrawn', line: `${name} withdrew the check-in on ${when}.` },
    'check-in.approved': { title: 'Check-in approved', line: `${name} approved the check-in on ${when}.` },
    'check-in.declined': { title: 'Check-in declined', line: `${name} declined the check-in on ${when}.` },
    'check-in.new-time-proposed': { title: 'New time proposed', line: `${name} proposed ${when} instead.` },
    'check-in.new-time-accepted': { title: 'New time accepted', line: `${name} accepted the check-in on ${when}.` },
    'check-in.new-time-declined': { title: 'New time declined', line: `${name} declined the new time, ${when}.` },
    'check-in.cancelled': { title: 'Check-in cancelled', line: `${name} cancelled the check-in on ${when}.` },
    'check-in.request-expired': {
      title: 'Check-in request expired',
      line: `${capitalised(theCheckin)} on ${when} was not answered in time.`,
    },
    'check-in.new-time-expired': {
      title: 'New time expired',
      line: `${capitalised(theNewTime)}, ${when}, was not answered in time.`,
    },
    'check-in.clash-missed': {
      title: 'Weekly check-in missed',
      line: `No new time was found for ${theCheckin} on ${when}.`,
    },
  };

  return copy[kind];
}

function checkinHref(checkInId: string, reading: NotificationReading): string {
  return reading.party === 'coach' ? coachCheckinPath(checkInId) : clientCheckinPath(checkInId);
}

function clashCopy(facts: SeriesClashFacts): { title: string; line: string } {
  if (facts.clashes === 1) {
    return {
      title: 'Weekly check-in clashes',
      line: `${facts.clientName}'s new week falls on a taken hour.`,
    };
  }

  return {
    title: `${facts.clashes} weekly check-ins clash`,
    line: `${facts.clientName}'s new weeks fall on a taken hour.`,
  };
}

export function describeNotification(
  notification: NotificationEvent,
  reading: NotificationReading,
): DescribedNotification {
  switch (notification.kind) {
    case 'check-in.series-set-up':
      return {
        title: 'Weekly check-in set up',
        line: `${capitalised(weeklyRuleOf(notification.facts.firstWeekStartsAt, reading.timeZone))}.`,
        href: clientCheckinPath(notification.facts.firstWeekId),
      };
    case 'check-in.series-changed':
      return {
        title: 'Weekly check-in changed',
        line: `Now ${weeklyRuleOf(notification.facts.firstWeekStartsAt, reading.timeZone)}.`,
        href: clientCheckinPath(notification.facts.firstWeekId),
      };
    case 'check-in.series-stopped':
      return {
        title: 'Weekly check-in stopped',
        line: `${COACH_DISPLAY_NAME} stopped your weekly check-in.`,
        href: CLIENT_CHECKINS_PATH,
      };
    case 'check-in.series-clashes':
      return { ...clashCopy(notification.facts), href: coachCheckinPath(notification.facts.earliestId) };
    case 'message.received':
      return {
        title: notification.facts.senderName,
        line: notification.facts.text,
        href:
          reading.party === 'coach'
            ? `/coach/messages?client=${encodeURIComponent(notification.facts.clientId)}`
            : '/portal/messages',
      };
    case 'program.ready':
      return {
        title: PROGRAM_READY_NOTIFICATION.title,
        line: PROGRAM_READY_NOTIFICATION.message,
        href: PROGRAM_READY_NOTIFICATION.link,
      };
    default:
      return {
        ...momentCopy(notification.kind, notification.facts, reading),
        href: checkinHref(notification.facts.checkInId, reading),
      };
  }
}
