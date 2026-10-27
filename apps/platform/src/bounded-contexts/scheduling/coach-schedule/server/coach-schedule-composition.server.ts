import type { DatabaseClient } from "~/shared/database";
import {
  GetCoachScheduleSettingsUseCase,
  UpdateCoachScheduleSettingsUseCase,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-schedule";
import type {
  CoachAvailabilitySource,
  CoachCalendar,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import type { CoachMeetingRoomSource } from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-meeting-room";
import type { Clock } from "~/bounded-contexts/scheduling/coach-schedule/domain/clock";

import { CoachScheduleSettingsController } from "~/bounded-contexts/scheduling/coach-schedule/api/coach-schedule-settings-controller.server";
import { PostgresCoachAvailability } from "~/bounded-contexts/scheduling/coach-schedule/data/availability/postgres-coach-availability.server";
import { PostgresCoachMeetingRoom } from "~/bounded-contexts/scheduling/coach-schedule/data/meeting-room/postgres-coach-meeting-room.server";
import {
  releaseCoachTime,
  reserveCoachTime,
} from "~/bounded-contexts/scheduling/coach-schedule/data/reservations/coach-time-reservations.server";
import { PostgresCoachCalendar } from "~/bounded-contexts/scheduling/coach-schedule/data/reservations/postgres-coach-calendar.server";

export type CoachScheduleFeature = {
  coachScheduleSettings: CoachScheduleSettingsController;
};

type CoachScheduleComposition = {
  feature: CoachScheduleFeature;
  handles: {
    availability: CoachAvailabilitySource;
    calendar: CoachCalendar;
    coachTime: {
      release: typeof releaseCoachTime;
      reserve: typeof reserveCoachTime;
    };
    meetingRoom: CoachMeetingRoomSource;
  };
};

type CoachScheduleFeatureHandles = {
  clock: Clock;
  database: DatabaseClient;
};

export function composeCoachScheduleFeature(
  handles: CoachScheduleFeatureHandles,
): CoachScheduleComposition {
  const availability = new PostgresCoachAvailability(handles);
  const meetingRoom = new PostgresCoachMeetingRoom(handles);

  return {
    feature: {
      coachScheduleSettings: new CoachScheduleSettingsController({
        getSettings: new GetCoachScheduleSettingsUseCase({
          availability,
          meetingRoom,
        }),
        updateSettings: new UpdateCoachScheduleSettingsUseCase({
          availabilityChanges: availability,
          meetingRoomChanges: meetingRoom,
        }),
      }),
    },
    handles: {
      availability,
      calendar: new PostgresCoachCalendar(handles.database),
      coachTime: { release: releaseCoachTime, reserve: reserveCoachTime },
      meetingRoom,
    },
  };
}
