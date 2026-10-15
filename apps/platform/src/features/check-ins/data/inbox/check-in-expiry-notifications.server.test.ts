import {
  CheckIn,
  type LapsedCheckIn,
  type ListLapsedCheckInsUseCase,
} from "@eli-coach-platform/domain/check-in";
import { describe, expect, it, vi } from "vitest";

import { CheckInExpiryNotifications } from "./check-in-expiry-notifications.server";

const CHECK_IN_ID = "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c";
const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const STARTS_AT = new Date("2026-10-17T15:00:00.000Z");
const NOW = new Date("2026-10-19T09:00:00.000Z");
const SINCE = new Date("2026-07-21T09:00:00.000Z");

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
  requestedAt: SINCE,
  answeredAt: null,
  earlierStartsAt: null,
  moves: 0,
  newTimeNote: null,
}).toSnapshot();

function createSource(lapsed: LapsedCheckIn[]) {
  const execute = vi.fn().mockResolvedValue(lapsed);
  const source = new CheckInExpiryNotifications({
    listLapsedCheckIns: { execute } as unknown as ListLapsedCheckInsUseCase,
  });

  return { execute, source };
}

describe("CheckInExpiryNotifications", () => {
  it("asks for the coach's lapsed check-ins across every client", async () => {
    // arrange
    const { execute, source } = createSource([]);

    // act
    await source.expiredFor({
      recipient: { party: "coach" },
      since: SINCE,
      at: NOW,
    });

    // assert
    expect(execute).toHaveBeenCalledWith({
      party: "coach",
      clientId: null,
      since: SINCE,
      at: NOW,
    });
  });

  it("asks for a client's own lapsed check-ins only", async () => {
    // arrange
    const { execute, source } = createSource([]);

    // act
    await source.expiredFor({
      recipient: { party: "client", clientId: CLIENT_ID },
      since: SINCE,
      at: NOW,
    });

    // assert
    expect(execute).toHaveBeenCalledWith({
      party: "client",
      clientId: CLIENT_ID,
      since: SINCE,
      at: NOW,
    });
  });

  it("drafts each lapse once, arriving when the check-in's time passed", async () => {
    // arrange
    const { source } = createSource([
      {
        checkIn: CHECK_IN,
        lapse: "request_expired",
        lapsedAt: STARTS_AT,
        party: "client",
        client: ANA,
      },
    ]);

    // act
    const drafts = await source.expiredFor({
      recipient: { party: "client", clientId: CLIENT_ID },
      since: SINCE,
      at: NOW,
    });

    // assert
    expect(drafts).toEqual([
      {
        recipient: { party: "client", clientId: CLIENT_ID },
        kind: "check-in.request-expired",
        facts: { checkInId: CHECK_IN_ID, startsAt: STARTS_AT.toISOString() },
        arrivedAt: STARTS_AT,
        onceKey: `check-in:${CHECK_IN_ID}:request_expired:client`,
      },
    ]);
  });
});
