import { describe, expect, it, vi } from "vitest";

import {
  CoachAvailability,
  type CoachAvailabilityChangesPort,
  type CoachAvailabilityProps,
  type CoachAvailabilitySourcePort,
} from "../coach-availability";
import {
  CoachMeetingRoom,
  type CoachMeetingRoomChangesPort,
  type CoachMeetingRoomSourcePort,
} from "../coach-meeting-room";

import type { CoachScheduleSettingsSnapshot } from "./coach-schedule";
import { GetCoachScheduleSettingsUseCase } from "./get-coach-schedule-settings-use-case";
import { UpdateCoachScheduleSettingsUseCase } from "./update-coach-schedule-settings-use-case";

const CONFIGURED_AVAILABILITY = {
  timeZone: "Europe/Bucharest",
  weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  startHour: 17,
  endHour: 20,
} satisfies CoachAvailabilityProps;

function configuredAvailabilityOrThrow(
  props: CoachAvailabilityProps,
): CoachAvailability {
  const result = CoachAvailability.from(props);

  if (result.status !== "configured") {
    throw new Error(
      `Expected a configured availability, got problems: ${result.problems.join(", ")}`,
    );
  }

  return result.availability;
}

function configuredRoom(url: string): CoachMeetingRoom {
  const result = CoachMeetingRoom.from(url);

  if (result.status !== "set") {
    throw new Error(`Expected a set room, got ${result.status}`);
  }

  return result.room;
}

function createAvailabilitySource(
  coachAvailabilitySourcePort?: Partial<CoachAvailabilitySourcePort>,
): CoachAvailabilitySourcePort {
  return {
    current: vi
      .fn()
      .mockResolvedValue(
        configuredAvailabilityOrThrow(CONFIGURED_AVAILABILITY),
      ),
    ...coachAvailabilitySourcePort,
  };
}

function createAvailabilityChanges(
  coachAvailabilityChangesPort?: Partial<CoachAvailabilityChangesPort>,
): CoachAvailabilityChangesPort {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    ...coachAvailabilityChangesPort,
  };
}

function createMeetingRoomSource(
  coachMeetingRoomSourcePort?: Partial<CoachMeetingRoomSourcePort>,
): CoachMeetingRoomSourcePort {
  return {
    current: vi.fn().mockResolvedValue(null),
    ...coachMeetingRoomSourcePort,
  };
}

function createMeetingRoomChanges(
  coachMeetingRoomChangesPort?: Partial<CoachMeetingRoomChangesPort>,
): CoachMeetingRoomChangesPort {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    ...coachMeetingRoomChangesPort,
  };
}

describe("GetCoachScheduleSettingsUseCase", () => {
  it("composes the availability and the meeting room into one snapshot", async () => {
    // arrange
    const getCoachScheduleSettingsUseCase = new GetCoachScheduleSettingsUseCase(
      {
        coachAvailabilitySourcePort: createAvailabilitySource(),
        coachMeetingRoomSourcePort: createMeetingRoomSource({
          current: vi
            .fn()
            .mockResolvedValue(configuredRoom("https://meet.example.com/room")),
        }),
      },
    );

    // act
    const settings = await getCoachScheduleSettingsUseCase.execute();

    // assert
    expect(settings).toEqual({
      timeZone: "Europe/Bucharest",
      weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      startHour: 17,
      endHour: 20,
      meetingLink: "https://meet.example.com/room",
    });
  });

  it("answers no meeting link while the coach has saved no room", async () => {
    // arrange
    const getCoachScheduleSettingsUseCase = new GetCoachScheduleSettingsUseCase(
      {
        coachAvailabilitySourcePort: createAvailabilitySource(),
        coachMeetingRoomSourcePort: createMeetingRoomSource(),
      },
    );

    // act
    const settings = await getCoachScheduleSettingsUseCase.execute();

    // assert
    expect(settings.meetingLink).toBeNull();
  });
});

describe("UpdateCoachScheduleSettingsUseCase", () => {
  const validCommand = {
    timeZone: "Europe/Bucharest",
    weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    startHour: 9,
    endHour: 12,
    meetingLink: "https://meet.example.com/room",
  } satisfies CoachScheduleSettingsSnapshot;

  it("saves the availability and then the room when both are valid", async () => {
    // arrange
    const coachAvailabilityChangesPort = createAvailabilityChanges();
    const coachMeetingRoomChangesPort = createMeetingRoomChanges();
    const updateCoachScheduleSettingsUseCase =
      new UpdateCoachScheduleSettingsUseCase({
        coachAvailabilityChangesPort,
        coachMeetingRoomChangesPort,
      });

    // act
    const result =
      await updateCoachScheduleSettingsUseCase.execute(validCommand);

    // assert
    expect(result).toEqual({ status: "saved", settings: validCommand });
    expect(coachAvailabilityChangesPort.save).toHaveBeenCalledWith(
      expect.objectContaining({
        timeZone: "Europe/Bucharest",
        startHour: 9,
        endHour: 12,
      }),
    );
    expect(coachMeetingRoomChangesPort.save).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://meet.example.com/room" }),
    );

    const savedAvailability = coachAvailabilityChangesPort.save as ReturnType<
      typeof vi.fn
    >;
    const savedRoom = coachMeetingRoomChangesPort.save as ReturnType<
      typeof vi.fn
    >;

    expect(savedAvailability.mock.invocationCallOrder[0]).toBeLessThan(
      savedRoom.mock.invocationCallOrder[0]!,
    );
  });

  it("saves an empty meeting link as no room", async () => {
    // arrange
    const coachMeetingRoomChangesPort = createMeetingRoomChanges();
    const updateCoachScheduleSettingsUseCase =
      new UpdateCoachScheduleSettingsUseCase({
        coachAvailabilityChangesPort: createAvailabilityChanges(),
        coachMeetingRoomChangesPort,
      });

    // act
    const result = await updateCoachScheduleSettingsUseCase.execute({
      ...validCommand,
      meetingLink: "",
    });

    // assert
    expect(result).toEqual({
      status: "saved",
      settings: { ...validCommand, meetingLink: null },
    });
    expect(coachMeetingRoomChangesPort.save).toHaveBeenCalledWith(null);
  });

  it("refuses without saving anything when no weekday is selected", async () => {
    // arrange
    const coachAvailabilityChangesPort = createAvailabilityChanges();
    const coachMeetingRoomChangesPort = createMeetingRoomChanges();
    const updateCoachScheduleSettingsUseCase =
      new UpdateCoachScheduleSettingsUseCase({
        coachAvailabilityChangesPort,
        coachMeetingRoomChangesPort,
      });

    // act
    const result = await updateCoachScheduleSettingsUseCase.execute({
      ...validCommand,
      weekdays: [],
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: ["no_weekday"] });
    expect(coachAvailabilityChangesPort.save).not.toHaveBeenCalled();
    expect(coachMeetingRoomChangesPort.save).not.toHaveBeenCalled();
  });

  it("refuses without saving anything for an invalid meeting link", async () => {
    // arrange
    const coachAvailabilityChangesPort = createAvailabilityChanges();
    const coachMeetingRoomChangesPort = createMeetingRoomChanges();
    const updateCoachScheduleSettingsUseCase =
      new UpdateCoachScheduleSettingsUseCase({
        coachAvailabilityChangesPort,
        coachMeetingRoomChangesPort,
      });

    // act
    const result = await updateCoachScheduleSettingsUseCase.execute({
      ...validCommand,
      meetingLink: "not-a-url",
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: ["invalid_meeting_link"],
    });
    expect(coachAvailabilityChangesPort.save).not.toHaveBeenCalled();
    expect(coachMeetingRoomChangesPort.save).not.toHaveBeenCalled();
  });

  it("collects every problem when the availability and the link are both invalid", async () => {
    // arrange
    const updateCoachScheduleSettingsUseCase =
      new UpdateCoachScheduleSettingsUseCase({
        coachAvailabilityChangesPort: createAvailabilityChanges(),
        coachMeetingRoomChangesPort: createMeetingRoomChanges(),
      });

    // act
    const result = await updateCoachScheduleSettingsUseCase.execute({
      ...validCommand,
      weekdays: [],
      meetingLink: "not-a-url",
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: ["no_weekday", "invalid_meeting_link"],
    });
  });
});
