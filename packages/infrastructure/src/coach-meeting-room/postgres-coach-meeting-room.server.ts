import {
  CoachMeetingRoom,
  type CoachMeetingRoomChanges,
  type CoachMeetingRoomSource,
} from "@eli-coach-platform/domain/coach-meeting-room";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { DatabaseClient } from "@eli-coach-platform/db";
import { eq } from "drizzle-orm";

import {
  coachMeetingRoomTable,
  SINGLETON_COACH_MEETING_ROOM_ID,
} from "./schema.server";

type PostgresCoachMeetingRoomOptions = {
  database: DatabaseClient;
  clock: Clock;
};

export class PostgresCoachMeetingRoom
  implements CoachMeetingRoomSource, CoachMeetingRoomChanges
{
  constructor(private readonly options: PostgresCoachMeetingRoomOptions) {}

  async current(): Promise<CoachMeetingRoom | null> {
    const [row] = await this.options.database
      .select()
      .from(coachMeetingRoomTable)
      .where(eq(coachMeetingRoomTable.id, SINGLETON_COACH_MEETING_ROOM_ID))
      .limit(1);

    if (!row) {
      return null;
    }

    const result = CoachMeetingRoom.from(row.url);

    return result.status === "set" ? result.room : null;
  }

  async save(room: CoachMeetingRoom | null): Promise<void> {
    const values = {
      id: SINGLETON_COACH_MEETING_ROOM_ID,
      url: room ? room.url : null,
      updatedAt: this.options.clock.now(),
    };

    await this.options.database
      .insert(coachMeetingRoomTable)
      .values(values)
      .onConflictDoUpdate({
        target: coachMeetingRoomTable.id,
        set: values,
      });
  }
}
