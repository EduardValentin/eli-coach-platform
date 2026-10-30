import {
  CoachMeetingRoom,
  type CoachMeetingRoomChangesPort,
  type CoachMeetingRoomSourcePort,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-meeting-room";
import type { ClockPort } from "~/bounded-contexts/scheduling/coach-schedule/domain/clock-port";
import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import { eq } from "drizzle-orm";

import {
  coachMeetingRoomTable,
  SINGLETON_COACH_MEETING_ROOM_ID,
} from "../schema.server";

type PostgresCoachMeetingRoomOptions = {
  database: DatabaseClient;
  clockPort: ClockPort;
};

export class PostgresCoachMeetingRoomRepository
  implements CoachMeetingRoomSourcePort, CoachMeetingRoomChangesPort
{
  constructor(private readonly options: PostgresCoachMeetingRoomOptions) {}

  private get executor() {
    return executorOf(this.options.database);
  }

  async current(): Promise<CoachMeetingRoom | null> {
    const [row] = await this.executor
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
      updatedAt: this.options.clockPort.now(),
    };

    await this.executor
      .insert(coachMeetingRoomTable)
      .values(values)
      .onConflictDoUpdate({
        target: coachMeetingRoomTable.id,
        set: values,
      });
  }
}
