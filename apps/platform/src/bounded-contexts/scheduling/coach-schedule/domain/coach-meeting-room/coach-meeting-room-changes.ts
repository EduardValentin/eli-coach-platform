import type { CoachMeetingRoom } from "./coach-meeting-room";

export interface CoachMeetingRoomChanges {
  save(room: CoachMeetingRoom | null): Promise<void>;
}
