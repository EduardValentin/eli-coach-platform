import { describe, expect, it, vi } from "vitest";

import type { ClientIdentitiesPort } from "./client-identities-port";

import { CheckIn, type CheckInProps } from "./check-in";
import { CheckInAnnouncer } from "./check-in-announcer";
import type { CheckInInboxPort } from "./check-in-inbox-port";
import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import type { CheckInNotificationsPort } from "./check-in-notifications-port";
import { CheckInSeries, type CheckInSeriesSnapshot } from "./check-in-series";

const NOW = new Date("2026-10-15T09:00:00.000Z");

const ANA = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
};

const REQUEST: CheckInProps = {
  id: "check-in-1",
  seriesId: null,
  clientId: "client-1",
  startsAt: new Date("2026-10-17T15:00:00.000Z"),
  clientTimeZone: "Europe/London",
  coachTimeZone: "Europe/Bucharest",
  kind: "ad_hoc",
  recordedStatus: "pending",
  initiatedBy: "client",
  proposedBy: "client",
  note: null,
  requestedAt: new Date("2026-10-15T09:00:00.000Z"),
  answeredAt: null,
  earlierStartsAt: null,
  moves: 0,
  newTimeNote: null,
};

const SERIES = {
  id: "series-1",
  clientId: "client-1",
  weekday: "wednesday",
  hour: 18,
  timeZone: "Europe/Bucharest",
  coversFrom: new Date("2026-10-20T09:00:00.000Z"),
  coversUntil: new Date("2026-12-20T09:00:00.000Z"),
  setUpAt: new Date("2026-10-15T09:00:00.000Z"),
  changedAt: null,
  stoppedAt: null,
} satisfies CheckInSeriesSnapshot;

const FIRST_WEEK = new Date("2026-10-21T15:00:00.000Z");

function weekOf(id: string, startsAt: string): CheckIn {
  return CheckIn.seriesOccurrence({
    id,
    seriesId: "series-1",
    clientId: "client-1",
    startsAt: new Date(startsAt),
    clientTimeZone: "Europe/London",
    coachTimeZone: "Europe/Bucharest",
    at: new Date("2026-10-15T09:00:00.000Z"),
  }).asClash();
}

function createAnnouncer() {
  const identities = {
    findByClientIds: vi.fn().mockResolvedValue([ANA]),
  } satisfies Pick<ClientIdentitiesPort, "findByClientIds">;
  const notifications = {
    requested: vi.fn().mockResolvedValue("sent"),
    withdrawn: vi.fn().mockResolvedValue("sent"),
    approved: vi.fn().mockResolvedValue("sent"),
    declined: vi.fn().mockResolvedValue("sent"),
    newTimeProposed: vi.fn().mockResolvedValue("sent"),
    newTimeAccepted: vi.fn().mockResolvedValue("sent"),
    newTimeDeclined: vi.fn().mockResolvedValue("sent"),
    cancelled: vi.fn().mockResolvedValue("sent"),
    seriesSetUp: vi.fn().mockResolvedValue("sent"),
    seriesChanged: vi.fn().mockResolvedValue("sent"),
    seriesStopped: vi.fn().mockResolvedValue("sent"),
  } satisfies CheckInNotificationsPort;
  const inbox = {
    checkInEvent: vi.fn().mockResolvedValue(undefined),
    seriesEvent: vi.fn().mockResolvedValue(undefined),
    clashesAdded: vi.fn().mockResolvedValue(undefined),
    scheduleExpiries: vi.fn().mockResolvedValue(undefined),
  } satisfies CheckInInboxPort;
  const incidents = {
    checkInNotificationFailed: vi.fn(),
    checkInInboxFailed: vi.fn(),
    awaitingCheckInsCountFailed: vi.fn(),
    awaitingCheckInsListFailed: vi.fn(),
    nextCheckInLookupFailed: vi.fn(),
    checkInSeriesNotificationFailed: vi.fn(),
    checkInSeriesInboxFailed: vi.fn(),
    checkInSeriesExtensionFailed: vi.fn(),
    checkInSeriesReadFailed: vi.fn(),
  } satisfies CheckInIncidentsPort;
  const ports = {
    clockPort: { now: () => NOW },
    clientIdentitiesPort: identities,
    checkInInboxPort: inbox,
    checkInIncidentsPort: incidents,
    checkInNotificationsPort: notifications,
  };

  return { announcer: new CheckInAnnouncer(ports), ports };
}

describe("CheckInAnnouncer#announce", () => {
  it.each([
    { actedBy: "client", recipient: "coach" },
    { actedBy: "coach", recipient: "client" },
  ] as const)(
    "emails and writes to the inbox of the $recipient when the $actedBy acts",
    async ({ actedBy, recipient }) => {
      // arrange
      const { announcer, ports } = createAnnouncer();
      const checkIn = CheckIn.reconstitute(REQUEST);

      // act
      await announcer.announce("requested", checkIn, actedBy);

      // assert
      const notice = { checkIn: checkIn.toSnapshot(), client: ANA, recipient };
      expect(ports.checkInNotificationsPort.requested).toHaveBeenCalledWith(
        notice,
      );
      expect(ports.checkInInboxPort.checkInEvent).toHaveBeenCalledWith(
        "requested",
        notice,
      );
      expect(ports.clientIdentitiesPort.findByClientIds).toHaveBeenCalledOnce();
      expect(
        ports.checkInIncidentsPort.checkInNotificationFailed,
      ).not.toHaveBeenCalled();
      expect(
        ports.checkInIncidentsPort.checkInInboxFailed,
      ).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      failure: "answers failed",
      fail: (send: ReturnType<typeof vi.fn>) =>
        send.mockResolvedValue("failed"),
    },
    {
      failure: "throws",
      fail: (send: ReturnType<typeof vi.fn>) =>
        send.mockRejectedValue(new Error("down")),
    },
  ])(
    "still writes to the inbox and reports the email when sending $failure",
    async ({ fail }) => {
      // arrange
      const { announcer, ports } = createAnnouncer();
      fail(ports.checkInNotificationsPort.approved);

      // act
      await announcer.announce(
        "approved",
        CheckIn.reconstitute(REQUEST),
        "coach",
      );

      // assert
      expect(ports.checkInInboxPort.checkInEvent).toHaveBeenCalledOnce();
      expect(
        ports.checkInIncidentsPort.checkInNotificationFailed,
      ).toHaveBeenCalledWith({
        checkInId: "check-in-1",
        notification: "approved",
      });
      expect(
        ports.checkInIncidentsPort.checkInInboxFailed,
      ).not.toHaveBeenCalled();
    },
  );

  it("still emails and reports the inbox when writing to the inbox fails", async () => {
    // arrange
    const { announcer, ports } = createAnnouncer();
    ports.checkInInboxPort.checkInEvent.mockRejectedValue(
      new Error("connection refused"),
    );

    // act
    await announcer.announce(
      "declined",
      CheckIn.reconstitute(REQUEST),
      "coach",
    );

    // assert
    expect(ports.checkInNotificationsPort.declined).toHaveBeenCalledOnce();
    expect(ports.checkInIncidentsPort.checkInInboxFailed).toHaveBeenCalledWith({
      checkInId: "check-in-1",
      event: "declined",
    });
    expect(
      ports.checkInIncidentsPort.checkInNotificationFailed,
    ).not.toHaveBeenCalled();
  });

  it.each([
    { situation: "fails", read: vi.fn().mockRejectedValue(new Error("down")) },
    { situation: "finds no client", read: vi.fn().mockResolvedValue([]) },
  ])(
    "reports both channels when reading her identity $situation",
    async ({ read }) => {
      // arrange
      const { announcer, ports } = createAnnouncer();
      ports.clientIdentitiesPort.findByClientIds = read;

      // act
      await announcer.announce(
        "cancelled",
        CheckIn.reconstitute(REQUEST),
        "client",
      );

      // assert
      expect(ports.checkInNotificationsPort.cancelled).not.toHaveBeenCalled();
      expect(ports.checkInInboxPort.checkInEvent).not.toHaveBeenCalled();
      expect(
        ports.checkInIncidentsPort.checkInNotificationFailed,
      ).toHaveBeenCalledWith({
        checkInId: "check-in-1",
        notification: "cancelled",
      });
      expect(
        ports.checkInIncidentsPort.checkInInboxFailed,
      ).toHaveBeenCalledWith({
        checkInId: "check-in-1",
        event: "cancelled",
      });
    },
  );
});

describe("CheckInAnnouncer#announceSeries", () => {
  it("emails the client the series and writes it to her inbox with its first week", async () => {
    // arrange
    const { announcer, ports } = createAnnouncer();

    // act
    await announcer.announceSeries("seriesSetUp", {
      series: CheckInSeries.reconstitute(SERIES),
      weekStartsAt: FIRST_WEEK,
      clientTimeZone: "Europe/London",
      firstWeekId: "week-1",
    });

    // assert
    const notice = {
      series: SERIES,
      weekStartsAt: FIRST_WEEK,
      clientTimeZone: "Europe/London",
      client: ANA,
      recipient: "client",
    };
    expect(ports.checkInNotificationsPort.seriesSetUp).toHaveBeenCalledWith(
      notice,
    );
    expect(ports.checkInInboxPort.seriesEvent).toHaveBeenCalledWith(
      "seriesSetUp",
      {
        ...notice,
        firstWeekId: "week-1",
      },
    );
  });

  it("still writes to the inbox and reports the email when the series email fails", async () => {
    // arrange
    const { announcer, ports } = createAnnouncer();
    ports.checkInNotificationsPort.seriesChanged.mockResolvedValue("failed");

    // act
    await announcer.announceSeries("seriesChanged", {
      series: CheckInSeries.reconstitute(SERIES),
      weekStartsAt: FIRST_WEEK,
      clientTimeZone: "Europe/London",
      firstWeekId: "week-1",
    });

    // assert
    expect(ports.checkInInboxPort.seriesEvent).toHaveBeenCalledOnce();
    expect(
      ports.checkInIncidentsPort.checkInSeriesNotificationFailed,
    ).toHaveBeenCalledWith({
      seriesId: "series-1",
      notification: "seriesChanged",
    });
    expect(
      ports.checkInIncidentsPort.checkInSeriesInboxFailed,
    ).not.toHaveBeenCalled();
  });

  it("still emails and reports the inbox when writing the series to the inbox fails", async () => {
    // arrange
    const { announcer, ports } = createAnnouncer();
    ports.checkInInboxPort.seriesEvent.mockRejectedValue(
      new Error("connection refused"),
    );

    // act
    await announcer.announceSeries("seriesStopped", {
      series: CheckInSeries.reconstitute(SERIES),
      weekStartsAt: FIRST_WEEK,
      clientTimeZone: "Europe/London",
      firstWeekId: null,
    });

    // assert
    expect(ports.checkInNotificationsPort.seriesStopped).toHaveBeenCalledOnce();
    expect(
      ports.checkInIncidentsPort.checkInSeriesInboxFailed,
    ).toHaveBeenCalledWith({
      seriesId: "series-1",
      event: "seriesStopped",
    });
    expect(
      ports.checkInIncidentsPort.checkInSeriesNotificationFailed,
    ).not.toHaveBeenCalled();
  });
});

describe("CheckInAnnouncer#announceClashes", () => {
  it("writes one clash notice to the coach's inbox with the count and the earliest week, without an email", async () => {
    // arrange
    const { announcer, ports } = createAnnouncer();
    const later = weekOf("week-3", "2026-11-04T16:00:00.000Z");
    const earliest = weekOf("week-1", "2026-10-21T15:00:00.000Z");

    // act
    await announcer.announceClashes(CheckInSeries.reconstitute(SERIES), [
      later,
      earliest,
    ]);

    // assert
    expect(ports.checkInInboxPort.clashesAdded).toHaveBeenCalledWith({
      series: SERIES,
      client: ANA,
      clashes: 2,
      earliest: { id: "week-1", startsAt: earliest.startsAt },
    });
    expect(
      Object.values(ports.checkInNotificationsPort).every(
        (send) => send.mock.calls.length === 0,
      ),
    ).toBe(true);
  });

  it("reports the inbox when writing the clash notice fails", async () => {
    // arrange
    const { announcer, ports } = createAnnouncer();
    ports.checkInInboxPort.clashesAdded.mockRejectedValue(
      new Error("connection refused"),
    );

    // act
    await announcer.announceClashes(CheckInSeries.reconstitute(SERIES), [
      weekOf("week-1", "2026-10-21T15:00:00.000Z"),
    ]);

    // assert
    expect(
      ports.checkInIncidentsPort.checkInSeriesInboxFailed,
    ).toHaveBeenCalledWith({
      seriesId: "series-1",
      event: "clashesAdded",
    });
  });

  it("announces nothing without clashes", async () => {
    // arrange
    const { announcer, ports } = createAnnouncer();

    // act
    await announcer.announceClashes(CheckInSeries.reconstitute(SERIES), []);

    // assert
    expect(ports.clientIdentitiesPort.findByClientIds).not.toHaveBeenCalled();
    expect(ports.checkInInboxPort.clashesAdded).not.toHaveBeenCalled();
  });
});
