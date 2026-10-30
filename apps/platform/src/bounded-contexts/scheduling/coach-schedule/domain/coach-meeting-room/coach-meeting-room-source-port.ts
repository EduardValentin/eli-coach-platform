import type { CoachMeetingRoom } from "./coach-meeting-room";

export interface CoachMeetingRoomSourcePort {
  current(): Promise<CoachMeetingRoom | null>;
}
