import type { DatabaseClient } from "@eli-coach-platform/db";
import { CoachMeetingRoom } from "@eli-coach-platform/domain/coach-meeting-room";
import { describe, expect, it, vi } from "vitest";

import { PostgresCoachMeetingRoom } from "./postgres-coach-meeting-room.server";
import { coachMeetingRoomTable } from "./schema.server";

const NOW = new Date("2026-09-19T12:00:00.000Z");
const clock = { now: () => NOW };

function configuredRoom(url: string): CoachMeetingRoom {
  const result = CoachMeetingRoom.from(url);

  if (result.status !== "set") {
    throw new Error(`Expected a set room, got ${result.status}`);
  }

  return result.room;
}

describe("PostgresCoachMeetingRoom#current", () => {
  it("answers the room the stored row holds", async () => {
    // arrange
    const meetingRoom = new PostgresCoachMeetingRoom({
      database: createDatabaseReturning([
        {
          id: 1,
          url: "https://meet.example.com/room",
          updatedAt: new Date("2026-09-18T08:00:00.000Z"),
        },
      ]),
      clock,
    });

    // act
    const current = await meetingRoom.current();

    // assert
    expect(current?.url).toBe("https://meet.example.com/room");
  });

  it("answers null when no row exists", async () => {
    // arrange
    const meetingRoom = new PostgresCoachMeetingRoom({
      database: createDatabaseReturning([]),
      clock,
    });

    // act
    const current = await meetingRoom.current();

    // assert
    expect(current).toBeNull();
  });

  it("answers null when the stored row has no url", async () => {
    // arrange
    const meetingRoom = new PostgresCoachMeetingRoom({
      database: createDatabaseReturning([
        { id: 1, url: null, updatedAt: new Date("2026-09-18T08:00:00.000Z") },
      ]),
      clock,
    });

    // act
    const current = await meetingRoom.current();

    // assert
    expect(current).toBeNull();
  });
});

describe("PostgresCoachMeetingRoom#save", () => {
  it("upserts the room's url and stamps updated_at from the clock", async () => {
    // arrange
    const database = createUpsertingDatabase();
    const meetingRoom = new PostgresCoachMeetingRoom({
      database: database.client,
      clock,
    });

    // act
    await meetingRoom.save(configuredRoom("https://meet.example.com/room"));

    // assert
    expect(database.values).toHaveBeenCalledWith({
      id: 1,
      url: "https://meet.example.com/room",
      updatedAt: NOW,
    });
    expect(database.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ target: coachMeetingRoomTable.id }),
    );
  });

  it("upserts a null url when the coach clears the room", async () => {
    // arrange
    const database = createUpsertingDatabase();
    const meetingRoom = new PostgresCoachMeetingRoom({
      database: database.client,
      clock,
    });

    // act
    await meetingRoom.save(null);

    // assert
    expect(database.values).toHaveBeenCalledWith({
      id: 1,
      url: null,
      updatedAt: NOW,
    });
  });
});

function createDatabaseReturning(rows: readonly unknown[]): DatabaseClient {
  return {
    select: vi.fn().mockReturnValue(createSelectChain(rows)),
  } as unknown as DatabaseClient;
}

function createSelectChain(rows: readonly unknown[]) {
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: () => chain,
    then: (onFulfilled: (value: readonly unknown[]) => unknown) =>
      Promise.resolve(rows).then(onFulfilled),
  };

  return chain;
}

function createUpsertingDatabase(): {
  client: DatabaseClient;
  values: ReturnType<typeof vi.fn>;
  onConflictDoUpdate: ReturnType<typeof vi.fn>;
} {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
  const insert = vi.fn().mockReturnValue({ values });

  return {
    client: { insert } as unknown as DatabaseClient,
    values,
    onConflictDoUpdate,
  };
}
