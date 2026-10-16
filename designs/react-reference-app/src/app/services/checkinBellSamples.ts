import { checkinStartsAt, type CheckIn } from '../domain/checkins';
import type { InboxContents, OnceDelivery } from '../context/NotificationContext';
import {
  recipientKey,
  type BellNotification,
  type CheckinMomentKind,
  type NotificationEvent,
  type NotificationParty,
  type NotificationRecipient,
} from '../domain/notifications';
import { DEMO_CLIENT } from './demoClient';

export const BELL_SEEDS = ['seeded', 'empty', 'many', 'all-read'] as const;
export type BellSeed = (typeof BELL_SEEDS)[number];

export const MANY_BELL_ENTRIES = 40;

const HOUR_MS = 60 * 60 * 1000;
const COACH: NotificationRecipient = { party: 'coach' };
const DEMO_CLIENT_RECIPIENT: NotificationRecipient = { party: 'client', clientId: DEMO_CLIENT.id };

type SeedEntry = {
  recipient: NotificationRecipient;
  event: NotificationEvent;
  hoursAgo: number;
  read?: true;
};

export type BellSeedSource = {
  checkins: readonly CheckIn[];
  lapses: readonly OnceDelivery[];
  now: Date;
};

const MOMENT_KINDS: readonly CheckinMomentKind[] = [
  'check-in.requested',
  'check-in.withdrawn',
  'check-in.approved',
  'check-in.declined',
  'check-in.new-time-proposed',
  'check-in.new-time-accepted',
  'check-in.new-time-declined',
  'check-in.cancelled',
  'check-in.request-expired',
  'check-in.new-time-expired',
  'check-in.clash-missed',
];

export function checkinMoment(
  kind: CheckinMomentKind,
  { checkin, to }: { checkin: CheckIn; to: NotificationParty },
): NotificationEvent {
  return {
    kind,
    facts: {
      checkInId: checkin.id,
      startsAt: checkinStartsAt(checkin).toISOString(),
      ...(to === 'coach' ? { clientName: checkin.clientName } : {}),
    },
  };
}

export function recipientOf(party: NotificationParty, checkin: CheckIn): NotificationRecipient {
  return party === 'coach' ? COACH : { party: 'client', clientId: checkin.clientId };
}

function momentEntry(
  kind: CheckinMomentKind,
  checkin: CheckIn | undefined,
  { to, hoursAgo, read }: { to: NotificationParty; hoursAgo: number; read?: true },
): SeedEntry[] {
  if (!checkin) return [];

  return [{ recipient: recipientOf(to, checkin), event: checkinMoment(kind, { checkin, to }), hoursAgo, read }];
}

function seededEntries(checkins: readonly CheckIn[]): SeedEntry[] {
  const byId = (id: string) => checkins.find((checkin) => checkin.id === id);

  return [
    {
      recipient: COACH,
      event: {
        kind: 'message.received',
        facts: { senderName: DEMO_CLIENT.name, text: 'Jane Doe sent you a message.', clientId: DEMO_CLIENT.id },
      },
      hoursAgo: 0.2,
    },
    ...momentEntry('check-in.requested', byId('ck-4'), { to: 'coach', hoursAgo: 1 }),
    ...momentEntry('check-in.requested', byId('ck-5'), { to: 'coach', hoursAgo: 2 }),
    ...momentEntry('check-in.new-time-proposed', byId('ck-15'), { to: 'coach', hoursAgo: 30, read: true }),
    {
      recipient: DEMO_CLIENT_RECIPIENT,
      event: {
        kind: 'message.received',
        facts: { senderName: 'Coach Eli', text: 'Your coach replied to your message.', clientId: DEMO_CLIENT.id },
      },
      hoursAgo: 0.2,
    },
    ...momentEntry('check-in.requested', byId('ck-14'), { to: 'client', hoursAgo: 20 }),
    ...momentEntry('check-in.new-time-proposed', byId('ck-10'), { to: 'client', hoursAgo: 40 }),
    ...momentEntry('check-in.new-time-accepted', byId('ck-16'), { to: 'client', hoursAgo: 72, read: true }),
  ];
}

function seriesEntry(index: number, checkin: CheckIn): NotificationEvent {
  const firstWeek = { firstWeekId: checkin.id, firstWeekStartsAt: checkinStartsAt(checkin).toISOString() };
  const events: NotificationEvent[] = [
    { kind: 'check-in.series-set-up', facts: firstWeek },
    { kind: 'check-in.series-changed', facts: firstWeek },
    { kind: 'check-in.series-stopped', facts: {} },
  ];

  return events[index % events.length];
}

function manyEntries(checkins: readonly CheckIn[]): SeedEntry[] {
  const clientCheckins = checkins.filter((checkin) => checkin.clientId === DEMO_CLIENT.id);
  if (checkins.length === 0 || clientCheckins.length === 0) return [];

  return Array.from({ length: MANY_BELL_ENTRIES }, (_, index): SeedEntry[] => {
    const hoursAgo = index * 5 + 0.1;
    const read = index >= 6 ? (true as const) : undefined;
    const coachCheckin = checkins[index % checkins.length];
    const clientCheckin = clientCheckins[index % clientCheckins.length];
    const coachEvent: NotificationEvent =
      index % 12 === 11
        ? {
            kind: 'check-in.series-clashes',
            facts: {
              clientName: coachCheckin.clientName,
              clashes: 1 + (index % 3),
              earliestId: coachCheckin.id,
              earliestStartsAt: checkinStartsAt(coachCheckin).toISOString(),
            },
          }
        : checkinMoment(MOMENT_KINDS[index % MOMENT_KINDS.length], { checkin: coachCheckin, to: 'coach' });
    const clientEvent =
      index % 4 === 3
        ? seriesEntry(index, clientCheckin)
        : checkinMoment(MOMENT_KINDS[index % MOMENT_KINDS.length], { checkin: clientCheckin, to: 'client' });

    return [
      { recipient: COACH, event: coachEvent, hoursAgo, read },
      { recipient: DEMO_CLIENT_RECIPIENT, event: clientEvent, hoursAgo, read },
    ];
  }).flat();
}

function asNotification(entry: SeedEntry, index: number, now: Date): BellNotification {
  return {
    ...entry.event,
    id: `nt-seed-${index}`,
    arrivedAt: new Date(now.getTime() - entry.hoursAgo * HOUR_MS),
    readAt: entry.read ? now : null,
  };
}

function lapseEntries(lapses: readonly OnceDelivery[], now: Date): SeedEntry[] {
  return lapses.map(({ recipient, event, arrivedAt }) => ({
    recipient,
    event,
    hoursAgo: (now.getTime() - arrivedAt.getTime()) / HOUR_MS,
  }));
}

function entriesFor(seed: BellSeed, { checkins, lapses, now }: BellSeedSource): SeedEntry[] {
  if (seed === 'empty') return [];
  if (seed === 'many') return manyEntries(checkins);

  const seeded = [...seededEntries(checkins), ...lapseEntries(lapses, now)];
  return seed === 'all-read' ? seeded.map((entry) => ({ ...entry, read: true as const })) : seeded;
}

export function bellSeedOf(seed: BellSeed, source: BellSeedSource): InboxContents {
  const entries: Record<string, BellNotification[]> = {};
  entriesFor(seed, source).forEach((entry, index) => {
    const key = recipientKey(entry.recipient);
    entries[key] = [...(entries[key] ?? []), asNotification(entry, index, source.now)];
  });

  return { entries, onceKeys: source.lapses.map((lapse) => lapse.onceKey) };
}

export function sampleArrival(party: NotificationParty, checkins: readonly CheckIn[]): NotificationEvent {
  const clientCheckin = checkins.find((checkin) => checkin.clientId === DEMO_CLIENT.id);
  if (party === 'client') {
    return clientCheckin
      ? checkinMoment('check-in.approved', { checkin: clientCheckin, to: 'client' })
      : { kind: 'check-in.series-stopped', facts: {} };
  }

  const request = checkins.find((checkin) => checkin.status === 'pending' && checkin.initiatedBy === 'client');
  const checkin = request ?? checkins[0];
  if (checkin) return checkinMoment('check-in.requested', { checkin, to: 'coach' });

  return {
    kind: 'check-in.requested',
    facts: {
      checkInId: 'ck-sample',
      startsAt: new Date(Date.now() + 24 * HOUR_MS).toISOString(),
      clientName: DEMO_CLIENT.name,
    },
  };
}
