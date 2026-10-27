import type { CoachMeetingRoom } from "./coach-meeting-room";

export interface CoachMeetingRoomSource {
  current(): Promise<CoachMeetingRoom | null>;
}
