import type { CoachMeetingRoomSourcePort } from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-meeting-room";
import type { MeetingRoomFacade } from "~/bounded-contexts/scheduling/public/meeting-room-facade";

export class MeetingRoomFacadeAdapter implements MeetingRoomFacade {
  constructor(
    private readonly coachMeetingRoomSourcePort: CoachMeetingRoomSourcePort,
  ) {}

  async currentJoinUrl() {
    return (await this.coachMeetingRoomSourcePort.current())?.url ?? null;
  }
}
