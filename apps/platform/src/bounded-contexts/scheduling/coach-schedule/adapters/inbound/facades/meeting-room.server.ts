import type { CoachMeetingRoomSource } from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-meeting-room";
import type { MeetingRoomFacade } from "~/bounded-contexts/scheduling/public/meeting-room";

export function createMeetingRoomFacade(
  meetingRoom: CoachMeetingRoomSource,
): MeetingRoomFacade {
  return {
    currentJoinUrl: async () => (await meetingRoom.current())?.url ?? null,
  };
}
