import {
  CoachAvailability,
  type CoachAvailabilityChanges,
} from "../coach-availability";
import {
  CoachMeetingRoom,
  type CoachMeetingRoomChanges,
} from "../coach-meeting-room";

import {
  coachScheduleSettingsOf,
  type CoachScheduleSettingsProblem,
  type CoachScheduleSettingsSnapshot,
} from "./coach-schedule";

type UpdateCoachScheduleSettingsResult =
  | { status: "saved"; settings: CoachScheduleSettingsSnapshot }
  | { status: "invalid"; problems: CoachScheduleSettingsProblem[] };

type UpdateCoachScheduleSettingsUseCaseOptions = {
  availabilityChanges: CoachAvailabilityChanges;
  meetingRoomChanges: CoachMeetingRoomChanges;
};

export class UpdateCoachScheduleSettingsUseCase {
  constructor(
    private readonly options: UpdateCoachScheduleSettingsUseCaseOptions,
  ) {}

  async execute(
    command: CoachScheduleSettingsSnapshot,
  ): Promise<UpdateCoachScheduleSettingsResult> {
    const availabilityResult = CoachAvailability.from(command);
    const roomResult = CoachMeetingRoom.from(command.meetingLink);

    if (
      availabilityResult.status === "invalid" ||
      roomResult.status === "invalid"
    ) {
      return {
        status: "invalid",
        problems: [
          ...(availabilityResult.status === "invalid"
            ? availabilityResult.problems
            : []),
          ...(roomResult.status === "invalid"
            ? (["invalid_meeting_link"] as const)
            : []),
        ],
      };
    }

    await this.options.availabilityChanges.save(
      availabilityResult.availability,
    );

    const room = roomResult.status === "set" ? roomResult.room : null;

    await this.options.meetingRoomChanges.save(room);

    return {
      status: "saved",
      settings: coachScheduleSettingsOf(availabilityResult.availability, room),
    };
  }
}
