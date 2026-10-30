import type { CoachAvailabilitySourcePort } from "../coach-availability";
import type { CoachMeetingRoomSourcePort } from "../coach-meeting-room";

import {
  coachScheduleSettingsOf,
  type CoachScheduleSettingsSnapshot,
} from "./coach-schedule";

type GetCoachScheduleSettingsUseCaseOptions = {
  coachAvailabilitySourcePort: CoachAvailabilitySourcePort;
  coachMeetingRoomSourcePort: CoachMeetingRoomSourcePort;
};

export class GetCoachScheduleSettingsUseCase {
  constructor(
    private readonly options: GetCoachScheduleSettingsUseCaseOptions,
  ) {}

  async execute(): Promise<CoachScheduleSettingsSnapshot> {
    const [availability, room] = await Promise.all([
      this.options.coachAvailabilitySourcePort.current(),
      this.options.coachMeetingRoomSourcePort.current(),
    ]);

    return coachScheduleSettingsOf(availability, room);
  }
}
