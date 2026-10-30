import type { CoachAvailabilitySourcePort } from "../coach-availability";
import type { CoachMeetingRoomSourcePort } from "../coach-meeting-room";

import {
  coachScheduleSettingsOf,
  type CoachScheduleSettingsSnapshot,
} from "./coach-schedule";

type GetCoachScheduleSettingsUseCaseOptions = {
  availability: CoachAvailabilitySourcePort;
  meetingRoom: CoachMeetingRoomSourcePort;
};

export class GetCoachScheduleSettingsUseCase {
  constructor(
    private readonly options: GetCoachScheduleSettingsUseCaseOptions,
  ) {}

  async execute(): Promise<CoachScheduleSettingsSnapshot> {
    const [availability, room] = await Promise.all([
      this.options.availability.current(),
      this.options.meetingRoom.current(),
    ]);

    return coachScheduleSettingsOf(availability, room);
  }
}
