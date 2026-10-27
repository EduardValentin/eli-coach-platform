import type { DatabaseClient } from "~/shared/database";
import {
  GetCoachScheduleSettingsUseCase,
  UpdateCoachScheduleSettingsUseCase,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-schedule";
import {
  CoachOpenings,
  type CoachTimeReservations,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import type { CoachMeetingRoomSource } from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-meeting-room";
import type { Clock } from "~/bounded-contexts/scheduling/coach-schedule/domain/clock";
import type { CoachTimeFacade } from "~/bounded-contexts/scheduling/public/coach-time";
import type { MeetingRoomFacade } from "~/bounded-contexts/scheduling/public/meeting-room";
import type { OpenSlotsFacade } from "~/bounded-contexts/scheduling/public/open-slots";

import { CoachScheduleSettingsController } from "~/bounded-contexts/scheduling/coach-schedule/adapters/inbound/http/coach-schedule-settings-controller.server";
import { createCoachTimeFacade } from "~/bounded-contexts/scheduling/coach-schedule/adapters/inbound/facades/coach-time.server";
import { createMeetingRoomFacade } from "~/bounded-contexts/scheduling/coach-schedule/adapters/inbound/facades/meeting-room.server";
import { createOpenSlotsFacade } from "~/bounded-contexts/scheduling/coach-schedule/adapters/inbound/facades/open-slots.server";
import { PostgresCoachAvailability } from "~/bounded-contexts/scheduling/coach-schedule/adapters/outbound/persistence/availability/postgres-coach-availability.server";
import { PostgresCoachMeetingRoom } from "~/bounded-contexts/scheduling/coach-schedule/adapters/outbound/persistence/meeting-room/postgres-coach-meeting-room.server";
import { PostgresCoachTimeReservations } from "~/bounded-contexts/scheduling/coach-schedule/adapters/outbound/persistence/reservations/coach-time-reservations.server";
import { PostgresCoachCalendar } from "~/bounded-contexts/scheduling/coach-schedule/adapters/outbound/persistence/reservations/postgres-coach-calendar.server";
import type { CoachScheduleFeature } from "~/bounded-contexts/scheduling/coach-schedule/adapters/inbound/http/context.server";

type CoachScheduleComposition = {
  feature: CoachScheduleFeature;
  handles: {
    coachTime: CoachTimeReservations;
    meetingRoom: CoachMeetingRoomSource;
    openings: CoachOpenings;
  };
  facades: {
    coachTime: CoachTimeFacade;
    meetingRoom: MeetingRoomFacade;
    openSlots: OpenSlotsFacade;
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
  const coachTime = new PostgresCoachTimeReservations(handles.database);
  const openings = new CoachOpenings({
    availability,
    calendar: new PostgresCoachCalendar(handles.database),
  });

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
    handles: { coachTime, meetingRoom, openings },
    facades: {
      coachTime: createCoachTimeFacade(coachTime),
      meetingRoom: createMeetingRoomFacade(meetingRoom),
      openSlots: createOpenSlotsFacade(openings),
    },
  };
}
