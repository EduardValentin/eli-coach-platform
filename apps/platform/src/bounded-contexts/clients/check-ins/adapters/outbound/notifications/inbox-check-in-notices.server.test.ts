import {
  CheckIn,
  type CheckInSeriesSnapshot,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type { NotificationInbox } from "~/bounded-contexts/clients/notifications/public";
import { describe, expect, it, vi } from "vitest";

import { InboxCheckInNotices } from "./inbox-check-in-notices.server";

const CHECK_IN_ID = "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c";
const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const FIRST_WEEK_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const STARTS_AT = new Date("2026-10-17T15:00:00.000Z");
const WEEK_STARTS_AT = new Date("2026-10-21T15:00:00.000Z");
const NOW = new Date("2026-10-15T09:00:00.000Z");

const ANA = {
  clientId: CLIENT_ID,
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
};

const CHECK_IN = CheckIn.reconstitute({
  id: CHECK_IN_ID,
  seriesId: null,
  clientId: CLIENT_ID,
  startsAt: STARTS_AT,
  clientTimeZone: "Europe/London",
  coachTimeZone: "Europe/Bucharest",
  kind: "ad_hoc",
  recordedStatus: "pending",
  initiatedBy: "client",
  proposedBy: "client",
  note: null,
  requestedAt: NOW,
  answeredAt: null,
  earlierStartsAt: null,
  moves: 0,
  newTimeNote: null,
}).toSnapshot();

const SERIES: CheckInSeriesSnapshot = {
  id: "3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a",
  clientId: CLIENT_ID,
  weekday: "wednesday",
  hour: 18,
  timeZone: "Europe/Bucharest",
  coversFrom: new Date("2026-10-20T09:00:00.000Z"),
  coversUntil: new Date("2027-01-20T09:00:00.000Z"),
  setUpAt: NOW,
  changedAt: null,
  stoppedAt: null,
};

function createNotices() {
  const inbox = {
    record: vi.fn().mockResolvedValue(undefined),
    withdrawUnarrived: vi.fn().mockResolvedValue(undefined),
  } satisfies Pick<NotificationInbox, "record" | "withdrawUnarrived">;
  const notices = new InboxCheckInNotices({
    clock: { now: () => NOW },
    inbox,
  });

  return { inbox, notices };
}

describe("InboxCheckInNotices", () => {
  it("records a check-in event in the bell of the party it reaches, arriving now", async () => {
    // arrange
    const { inbox, notices } = createNotices();

    // act
    await notices.checkInEvent("requested", {
      checkIn: CHECK_IN,
      client: ANA,
      recipient: "coach",
    });

    // assert
    expect(inbox.record).toHaveBeenCalledWith({
      drafts: [
        {
          recipient: { party: "coach" },
          kind: "check-in.requested",
          facts: {
            checkInId: CHECK_IN_ID,
            startsAt: STARTS_AT.toISOString(),
            clientName: "Ana Popescu",
          },
          arrivedAt: NOW,
          onceKey: null,
        },
      ],
      at: NOW,
    });
  });

  it("records a weekly check-in event in the client's bell", async () => {
    // arrange
    const { inbox, notices } = createNotices();

    // act
    await notices.seriesEvent("seriesSetUp", {
      series: SERIES,
      weekStartsAt: WEEK_STARTS_AT,
      clientTimeZone: "Europe/London",
      client: ANA,
      recipient: "client",
      firstWeekId: FIRST_WEEK_ID,
    });

    // assert
    expect(inbox.record).toHaveBeenCalledWith({
      drafts: [
        expect.objectContaining({
          recipient: { party: "client", clientId: CLIENT_ID },
          kind: "check-in.series-set-up",
        }),
      ],
      at: NOW,
    });
  });

  it("records the clashing weeks a renewal added in the coach's bell", async () => {
    // arrange
    const { inbox, notices } = createNotices();

    // act
    await notices.clashesAdded({
      series: SERIES,
      client: ANA,
      clashes: 1,
      earliest: { id: FIRST_WEEK_ID, startsAt: WEEK_STARTS_AT },
    });

    // assert
    expect(inbox.record).toHaveBeenCalledWith({
      drafts: [
        expect.objectContaining({
          recipient: { party: "coach" },
          kind: "check-in.series-clashes",
        }),
      ],
      at: NOW,
    });
  });

  it("rethrows a failed write so the announcer reports it", async () => {
    // arrange
    const { inbox, notices } = createNotices();
    const failure = new Error("connection reset");
    inbox.record.mockRejectedValue(failure);

    // act
    const recording = notices.checkInEvent("approved", {
      checkIn: CHECK_IN,
      client: ANA,
      recipient: "client",
    });

    // assert
    await expect(recording).rejects.toBe(failure);
  });
});
