import type { CoachMeetingRoom } from "./coach-meeting-room";

export interface CoachMeetingRoomChangesPort {
  save(room: CoachMeetingRoom | null): Promise<void>;
}
