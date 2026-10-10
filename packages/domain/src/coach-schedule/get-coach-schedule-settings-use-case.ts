import type { CoachAvailabilitySource } from "../coach-availability";
import type { CoachMeetingRoomSource } from "../coach-meeting-room";

import {
  coachScheduleSettingsOf,
  type CoachScheduleSettingsSnapshot,
} from "./coach-schedule";

type GetCoachScheduleSettingsUseCaseOptions = {
  availability: CoachAvailabilitySource;
  meetingRoom: CoachMeetingRoomSource;
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
