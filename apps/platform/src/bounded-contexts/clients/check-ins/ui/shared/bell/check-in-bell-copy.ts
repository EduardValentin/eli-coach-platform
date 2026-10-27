import { COACH_DISPLAY_NAME } from "@eli-coach-platform/content";
import type { z } from "zod";

import {
  formatClockTime,
  formatShortDay,
} from "~/bounded-contexts/scheduling/assessment-calls/public/call-moment";
import {
  CHECK_IN_BELL_FACTS,
  CHECK_IN_BELL_KINDS,
  type CheckInBellKind,
} from "~/bounded-contexts/clients/check-ins/public/check-in-bell";
import {
  CLIENT_CHECK_INS_PATH,
  clientCheckInPath,
  coachCheckInPath,
} from "~/bounded-contexts/clients/check-ins/public/paths";
import type {
  DescribedNotification,
  NotificationReading,
  NotificationReply,
} from "~/bounded-contexts/clients/notifications/public/notifications";

type CheckInBellFacts = {
  [Kind in CheckInBellKind]: z.infer<(typeof CHECK_IN_BELL_FACTS)[Kind]>;
};

type MomentKind = Exclude<
  CheckInBellKind,
  | typeof CHECK_IN_BELL_KINDS.seriesSetUp
  | typeof CHECK_IN_BELL_KINDS.seriesChanged
  | typeof CHECK_IN_BELL_KINDS.seriesStopped
  | typeof CHECK_IN_BELL_KINDS.seriesClashes
>;

type MomentFacts = CheckInBellFacts[MomentKind];

type SeriesWeekFacts = CheckInBellFacts[typeof CHECK_IN_BELL_KINDS.seriesSetUp];

type SeriesClashFacts =
  CheckInBellFacts[typeof CHECK_IN_BELL_KINDS.seriesClashes];

type ParsedCheckInNotification = {
  [Kind in CheckInBellKind]: { kind: Kind; facts: CheckInBellFacts[Kind] };
}[CheckInBellKind];

type Copy = Pick<DescribedNotification, "title" | "line">;

const UNNAMED_CLIENT = "Your client";

const WEEKDAY_LOCALE = "en-US";

export function describeCheckInNotification(
  notification: NotificationReply,
  reading: NotificationReading,
): DescribedNotification | null {
  const parsed = parsedNotificationOf(notification);

  if (parsed === null) {
    return null;
  }

  switch (parsed.kind) {
    case CHECK_IN_BELL_KINDS.seriesSetUp:
      return {
        title: "Weekly check-in set up",
        line: `${capitalised(weeklyRuleOf(parsed.facts, reading))}.`,
        href: firstWeekHrefOf(parsed.facts),
      };
    case CHECK_IN_BELL_KINDS.seriesChanged:
      return {
        title: "Weekly check-in changed",
        line: `Now ${weeklyRuleOf(parsed.facts, reading)}.`,
        href: firstWeekHrefOf(parsed.facts),
      };
    case CHECK_IN_BELL_KINDS.seriesStopped:
      return {
        title: "Weekly check-in stopped",
        line: `${COACH_DISPLAY_NAME} stopped your weekly check-in.`,
        href: CLIENT_CHECK_INS_PATH,
      };
    case CHECK_IN_BELL_KINDS.seriesClashes:
      return {
        ...clashCopyOf(parsed.facts),
        href: coachCheckInPath(parsed.facts.earliestId),
      };
    default:
      return {
        ...momentCopyOf(parsed.kind, { facts: parsed.facts, reading }),
        href:
          reading.party === "coach"
            ? coachCheckInPath(parsed.facts.checkInId)
            : clientCheckInPath(parsed.facts.checkInId),
      };
  }
}

function parsedNotificationOf(
  notification: NotificationReply,
): ParsedCheckInNotification | null {
  const kind = Object.values(CHECK_IN_BELL_KINDS).find(
    (candidate) => candidate === notification.kind,
  );

  if (kind === undefined) {
    return null;
  }

  const facts = CHECK_IN_BELL_FACTS[kind].safeParse(notification.facts);

  return facts.success
    ? ({ kind, facts: facts.data } as ParsedCheckInNotification)
    : null;
}

function momentCopyOf(
  kind: MomentKind,
  moment: { facts: MomentFacts; reading: NotificationReading },
): Copy {
  const { facts, reading } = moment;
  const instant = new Date(facts.startsAt);
  const when = `${formatShortDay(instant, reading.timeZone)} at ${formatClockTime(instant, reading.timeZone)}`;
  const namedClient = reading.party === "coach" ? facts.clientName : undefined;
  const actorName =
    reading.party === "coach"
      ? (facts.clientName ?? UNNAMED_CLIENT)
      : COACH_DISPLAY_NAME;
  const theCheckIn = namedClient ? `${namedClient}'s check-in` : "the check-in";
  const theNewTime = namedClient ? `${namedClient}'s new time` : "the new time";
  const copy: Record<MomentKind, Copy> = {
    [CHECK_IN_BELL_KINDS.requested]: {
      title: "Check-in requested",
      line: `${actorName} asked for a check-in on ${when}.`,
    },
    [CHECK_IN_BELL_KINDS.withdrawn]: {
      title: "Check-in request withdrawn",
      line: `${actorName} withdrew the check-in on ${when}.`,
    },
    [CHECK_IN_BELL_KINDS.approved]: {
      title: "Check-in approved",
      line: `${actorName} approved the check-in on ${when}.`,
    },
    [CHECK_IN_BELL_KINDS.declined]: {
      title: "Check-in declined",
      line: `${actorName} declined the check-in on ${when}.`,
    },
    [CHECK_IN_BELL_KINDS.newTimeProposed]: {
      title: "New time proposed",
      line: `${actorName} proposed ${when} instead.`,
    },
    [CHECK_IN_BELL_KINDS.newTimeAccepted]: {
      title: "New time accepted",
      line: `${actorName} accepted the check-in on ${when}.`,
    },
    [CHECK_IN_BELL_KINDS.newTimeDeclined]: {
      title: "New time declined",
      line: `${actorName} declined the new time, ${when}.`,
    },
    [CHECK_IN_BELL_KINDS.cancelled]: {
      title: "Check-in cancelled",
      line: `${actorName} cancelled the check-in on ${when}.`,
    },
    [CHECK_IN_BELL_KINDS.requestExpired]: {
      title: "Check-in request expired",
      line: `${capitalised(theCheckIn)} on ${when} was not answered in time.`,
    },
    [CHECK_IN_BELL_KINDS.newTimeExpired]: {
      title: "New time expired",
      line: `${capitalised(theNewTime)}, ${when}, was not answered in time.`,
    },
    [CHECK_IN_BELL_KINDS.clashMissed]: {
      title: "Weekly check-in missed",
      line: `No new time was found for ${theCheckIn} on ${when}.`,
    },
  };

  return copy[kind];
}

function clashCopyOf(facts: SeriesClashFacts): Copy {
  if (facts.clashes === 1) {
    return {
      title: "Weekly check-in clashes",
      line: `${facts.clientName}'s new week falls on a taken hour.`,
    };
  }

  return {
    title: `${facts.clashes} weekly check-ins clash`,
    line: `${facts.clientName}'s new weeks fall on a taken hour.`,
  };
}

function weeklyRuleOf(
  facts: SeriesWeekFacts,
  reading: NotificationReading,
): string {
  const instant = new Date(facts.firstWeekStartsAt);
  const { timeZone } = reading;
  const weekday = new Intl.DateTimeFormat(WEEKDAY_LOCALE, {
    timeZone,
    weekday: "long",
  }).format(instant);
  const from = new Intl.DateTimeFormat(WEEKDAY_LOCALE, {
    day: "numeric",
    month: "short",
    timeZone,
  }).format(instant);

  return `every ${weekday} at ${formatClockTime(instant, timeZone)}, from ${from}`;
}

function firstWeekHrefOf(facts: SeriesWeekFacts): string {
  return facts.firstWeekId === undefined
    ? CLIENT_CHECK_INS_PATH
    : clientCheckInPath(facts.firstWeekId);
}

function capitalised(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
