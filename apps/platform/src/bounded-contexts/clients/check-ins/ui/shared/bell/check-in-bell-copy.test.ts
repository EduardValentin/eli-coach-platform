import { describe, expect, it } from "vitest";

import {
  CHECK_IN_BELL_KINDS,
  type CheckInBellKind,
} from "~/bounded-contexts/clients/check-ins/public/check-in-bell";
import {
  CLIENT_CHECK_INS_PATH,
  clientCheckInPath,
  coachCheckInPath,
} from "~/bounded-contexts/clients/check-ins/public/paths";
import type {
  NotificationReading,
  NotificationReply,
} from "~/bounded-contexts/clients/notifications/public/notifications";

import { describeCheckInNotification } from "./check-in-bell-copy";

const ZONE = "Europe/Bucharest";
const COACH: NotificationReading = { party: "coach", timeZone: ZONE };
const CLIENT: NotificationReading = { party: "client", timeZone: ZONE };
const CHECK_IN_ID = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const FIRST_WEEK_ID = "1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e";
const EARLIEST_ID = "2c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e6f";
const FRIDAY_AT_SIX = "2026-10-16T15:00:00.000Z";
const THURSDAY_AT_SIX = "2026-10-22T15:00:00.000Z";

function notificationOf(
  kind: string,
  facts: NotificationReply["facts"],
): NotificationReply {
  return {
    id: "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f7a",
    kind,
    facts,
    arrivedAt: "2026-10-15T12:00:00.000Z",
    unread: true,
  };
}

function momentOf(kind: CheckInBellKind, clientName?: string) {
  return notificationOf(kind, {
    checkInId: CHECK_IN_ID,
    startsAt: FRIDAY_AT_SIX,
    ...(clientName === undefined ? {} : { clientName }),
  });
}

describe("the words of a check-in notification to the coach", () => {
  it.each<[CheckInBellKind, string, string]>([
    [
      CHECK_IN_BELL_KINDS.requested,
      "Check-in requested",
      "Jane Doe asked for a check-in on Fri, Oct 16 at 6:00 PM.",
    ],
    [
      CHECK_IN_BELL_KINDS.withdrawn,
      "Check-in request withdrawn",
      "Jane Doe withdrew the check-in on Fri, Oct 16 at 6:00 PM.",
    ],
    [
      CHECK_IN_BELL_KINDS.approved,
      "Check-in approved",
      "Jane Doe approved the check-in on Fri, Oct 16 at 6:00 PM.",
    ],
    [
      CHECK_IN_BELL_KINDS.declined,
      "Check-in declined",
      "Jane Doe declined the check-in on Fri, Oct 16 at 6:00 PM.",
    ],
    [
      CHECK_IN_BELL_KINDS.newTimeProposed,
      "New time proposed",
      "Jane Doe proposed Fri, Oct 16 at 6:00 PM instead.",
    ],
    [
      CHECK_IN_BELL_KINDS.newTimeAccepted,
      "New time accepted",
      "Jane Doe accepted the check-in on Fri, Oct 16 at 6:00 PM.",
    ],
    [
      CHECK_IN_BELL_KINDS.newTimeDeclined,
      "New time declined",
      "Jane Doe declined the new time, Fri, Oct 16 at 6:00 PM.",
    ],
    [
      CHECK_IN_BELL_KINDS.cancelled,
      "Check-in cancelled",
      "Jane Doe cancelled the check-in on Fri, Oct 16 at 6:00 PM.",
    ],
    [
      CHECK_IN_BELL_KINDS.requestExpired,
      "Check-in request expired",
      "Jane Doe's check-in on Fri, Oct 16 at 6:00 PM was not answered in time.",
    ],
    [
      CHECK_IN_BELL_KINDS.newTimeExpired,
      "New time expired",
      "Jane Doe's new time, Fri, Oct 16 at 6:00 PM, was not answered in time.",
    ],
    [
      CHECK_IN_BELL_KINDS.clashMissed,
      "Weekly check-in missed",
      "No new time was found for Jane Doe's check-in on Fri, Oct 16 at 6:00 PM.",
    ],
  ])("names the client for %s and opens the check-in", (kind, title, line) => {
    // arrange
    const notification = momentOf(kind, "Jane Doe");

    // act
    const described = describeCheckInNotification(notification, COACH);

    // assert
    expect(described).toEqual({
      title,
      line,
      href: coachCheckInPath(CHECK_IN_ID),
    });
  });

  it.each<[CheckInBellKind, string]>([
    [
      CHECK_IN_BELL_KINDS.requested,
      "Your client asked for a check-in on Fri, Oct 16 at 6:00 PM.",
    ],
    [
      CHECK_IN_BELL_KINDS.requestExpired,
      "The check-in on Fri, Oct 16 at 6:00 PM was not answered in time.",
    ],
  ])("words %s without a client name it was not given", (kind, line) => {
    // arrange
    const notification = momentOf(kind);

    // act
    const described = describeCheckInNotification(notification, COACH);

    // assert
    expect(described?.line).toBe(line);
  });

  it.each([
    [
      1,
      "Weekly check-in clashes",
      "Jane Doe's new week falls on a taken hour.",
    ],
    [
      3,
      "3 weekly check-ins clash",
      "Jane Doe's new weeks fall on a taken hour.",
    ],
  ])(
    "tells her %i renewed week(s) clash and opens the earliest",
    (clashes, title, line) => {
      // arrange
      const notification = notificationOf(CHECK_IN_BELL_KINDS.seriesClashes, {
        clientName: "Jane Doe",
        clashes,
        earliestId: EARLIEST_ID,
        earliestStartsAt: FRIDAY_AT_SIX,
      });

      // act
      const described = describeCheckInNotification(notification, COACH);

      // assert
      expect(described).toEqual({
        title,
        line,
        href: coachCheckInPath(EARLIEST_ID),
      });
    },
  );
});

describe("the words of a check-in notification to the client", () => {
  it.each<[CheckInBellKind, string]>([
    [
      CHECK_IN_BELL_KINDS.requested,
      "Eli asked for a check-in on Fri, Oct 16 at 6:00 PM.",
    ],
    [
      CHECK_IN_BELL_KINDS.withdrawn,
      "Eli withdrew the check-in on Fri, Oct 16 at 6:00 PM.",
    ],
    [
      CHECK_IN_BELL_KINDS.approved,
      "Eli approved the check-in on Fri, Oct 16 at 6:00 PM.",
    ],
    [
      CHECK_IN_BELL_KINDS.declined,
      "Eli declined the check-in on Fri, Oct 16 at 6:00 PM.",
    ],
    [
      CHECK_IN_BELL_KINDS.newTimeProposed,
      "Eli proposed Fri, Oct 16 at 6:00 PM instead.",
    ],
    [
      CHECK_IN_BELL_KINDS.newTimeAccepted,
      "Eli accepted the check-in on Fri, Oct 16 at 6:00 PM.",
    ],
    [
      CHECK_IN_BELL_KINDS.newTimeDeclined,
      "Eli declined the new time, Fri, Oct 16 at 6:00 PM.",
    ],
    [
      CHECK_IN_BELL_KINDS.cancelled,
      "Eli cancelled the check-in on Fri, Oct 16 at 6:00 PM.",
    ],
    [
      CHECK_IN_BELL_KINDS.requestExpired,
      "The check-in on Fri, Oct 16 at 6:00 PM was not answered in time.",
    ],
    [
      CHECK_IN_BELL_KINDS.newTimeExpired,
      "The new time, Fri, Oct 16 at 6:00 PM, was not answered in time.",
    ],
    [
      CHECK_IN_BELL_KINDS.clashMissed,
      "No new time was found for the check-in on Fri, Oct 16 at 6:00 PM.",
    ],
  ])("names her coach for %s and opens her check-in", (kind, line) => {
    // arrange
    const notification = momentOf(kind);

    // act
    const described = describeCheckInNotification(notification, CLIENT);

    // assert
    expect(described?.line).toBe(line);
    expect(described?.href).toBe(clientCheckInPath(CHECK_IN_ID));
  });

  it("tells her the weekly check-in she now has and opens its first week", () => {
    // arrange
    const notification = notificationOf(CHECK_IN_BELL_KINDS.seriesSetUp, {
      firstWeekId: FIRST_WEEK_ID,
      firstWeekStartsAt: THURSDAY_AT_SIX,
    });

    // act
    const described = describeCheckInNotification(notification, CLIENT);

    // assert
    expect(described).toEqual({
      title: "Weekly check-in set up",
      line: "Every Thursday at 6:00 PM, from Oct 22.",
      href: clientCheckInPath(FIRST_WEEK_ID),
    });
  });

  it("tells her the new weekly time and opens the next week", () => {
    // arrange
    const notification = notificationOf(CHECK_IN_BELL_KINDS.seriesChanged, {
      firstWeekId: FIRST_WEEK_ID,
      firstWeekStartsAt: THURSDAY_AT_SIX,
    });

    // act
    const described = describeCheckInNotification(notification, CLIENT);

    // assert
    expect(described).toEqual({
      title: "Weekly check-in changed",
      line: "Now every Thursday at 6:00 PM, from Oct 22.",
      href: clientCheckInPath(FIRST_WEEK_ID),
    });
  });

  it("opens her check-ins when the weekly change names no week", () => {
    // arrange
    const notification = notificationOf(CHECK_IN_BELL_KINDS.seriesChanged, {
      firstWeekStartsAt: THURSDAY_AT_SIX,
    });

    // act
    const described = describeCheckInNotification(notification, CLIENT);

    // assert
    expect(described?.href).toBe(CLIENT_CHECK_INS_PATH);
  });

  it("tells her the weekly check-in stopped and opens her check-ins", () => {
    // arrange
    const notification = notificationOf(CHECK_IN_BELL_KINDS.seriesStopped, {});

    // act
    const described = describeCheckInNotification(notification, CLIENT);

    // assert
    expect(described).toEqual({
      title: "Weekly check-in stopped",
      line: "Eli stopped your weekly check-in.",
      href: CLIENT_CHECK_INS_PATH,
    });
  });
});

describe("the reader's zone", () => {
  it("writes a check-in's time in the reader's own zone", () => {
    // arrange
    const notification = momentOf(CHECK_IN_BELL_KINDS.requested, "Jane Doe");

    // act
    const described = describeCheckInNotification(notification, {
      party: "coach",
      timeZone: "America/New_York",
    });

    // assert
    expect(described?.line).toBe(
      "Jane Doe asked for a check-in on Fri, Oct 16 at 11:00 AM.",
    );
  });

  it("takes the weekday, time and first day of a weekly check-in from the reader's zone", () => {
    // arrange
    const notification = notificationOf(CHECK_IN_BELL_KINDS.seriesSetUp, {
      firstWeekId: FIRST_WEEK_ID,
      firstWeekStartsAt: "2026-10-22T23:30:00.000Z",
    });

    // act
    const described = describeCheckInNotification(notification, CLIENT);

    // assert
    expect(described?.line).toBe("Every Friday at 2:30 AM, from Oct 23.");
  });
});

describe("a notification the check-ins feature cannot word", () => {
  it("answers nothing for a kind it does not write", () => {
    // arrange
    const notification = notificationOf("message.received", { text: "Hi" });

    // act
    const described = describeCheckInNotification(notification, COACH);

    // assert
    expect(described).toBeNull();
  });

  it("answers nothing for facts its kind does not carry", () => {
    // arrange
    const notification = notificationOf(CHECK_IN_BELL_KINDS.requested, {
      checkInId: "not-an-id",
      startsAt: FRIDAY_AT_SIX,
    });

    // act
    const described = describeCheckInNotification(notification, COACH);

    // assert
    expect(described).toBeNull();
  });
});
