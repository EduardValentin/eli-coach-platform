import type { MeetingRoomPort } from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type { MeetingRoomFacade } from "~/bounded-contexts/scheduling/public/meeting-room-facade";

export class SchedulingMeetingRoomAdapter implements MeetingRoomPort {
  constructor(private readonly meetingRoomFacade: MeetingRoomFacade) {}

  currentJoinUrl(): Promise<string | null> {
    return this.meetingRoomFacade.currentJoinUrl();
  }
}
