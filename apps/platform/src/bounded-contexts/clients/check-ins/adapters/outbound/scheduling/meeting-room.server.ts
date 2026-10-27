import type { MeetingRoom } from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type { MeetingRoomFacade } from "~/bounded-contexts/scheduling/public/meeting-room";

export class SchedulingMeetingRoom implements MeetingRoom {
  constructor(private readonly meetingRoom: MeetingRoomFacade) {}

  currentJoinUrl(): Promise<string | null> {
    return this.meetingRoom.currentJoinUrl();
  }
}
