import { appSchema } from "@eli-coach-platform/db";
import { sql } from "drizzle-orm";
import { check, smallint, text, timestamp } from "drizzle-orm/pg-core";

export const SINGLETON_COACH_MEETING_ROOM_ID = 1;

export const coachMeetingRoomTable = appSchema.table(
  "coach_meeting_room",
  {
    id: smallint("id").primaryKey(),
    url: text("url"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [check("coach_meeting_room_is_singleton", sql`${table.id} = 1`)],
);
