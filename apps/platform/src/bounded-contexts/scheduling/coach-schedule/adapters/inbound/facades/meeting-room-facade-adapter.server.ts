import type { CoachMeetingRoomSourcePort } from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-meeting-room";
import type { MeetingRoomFacade } from "~/bounded-contexts/scheduling/public/meeting-room-facade";

export class MeetingRoomFacadeAdapter implements MeetingRoomFacade {
  constructor(private readonly meetingRoom: CoachMeetingRoomSourcePort) {}

  async currentJoinUrl() {
    return (await this.meetingRoom.current())?.url ?? null;
  }
}
