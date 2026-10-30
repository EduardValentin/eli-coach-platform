import type { DatabaseClient } from "~/shared/database";
import {
  GetCoachScheduleSettingsUseCase,
  UpdateCoachScheduleSettingsUseCase,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-schedule";
import {
  CoachOpenings,
  type CoachTimeReservationsPort,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import type { CoachMeetingRoomSourcePort } from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-meeting-room";
import type { ClockPort } from "~/bounded-contexts/scheduling/coach-schedule/domain/clock-port";
import type { CoachTimeFacade } from "~/bounded-contexts/scheduling/public/coach-time-facade";
import type { MeetingRoomFacade } from "~/bounded-contexts/scheduling/public/meeting-room-facade";
import type { OpenSlotsFacade } from "~/bounded-contexts/scheduling/public/open-slots-facade";

import { CoachScheduleSettingsController } from "~/bounded-contexts/scheduling/coach-schedule/adapters/inbound/http/coach-schedule-settings-controller.server";
import { CoachTimeFacadeAdapter } from "~/bounded-contexts/scheduling/coach-schedule/adapters/inbound/facades/coach-time-facade-adapter.server";
import { MeetingRoomFacadeAdapter } from "~/bounded-contexts/scheduling/coach-schedule/adapters/inbound/facades/meeting-room-facade-adapter.server";
import { OpenSlotsFacadeAdapter } from "~/bounded-contexts/scheduling/coach-schedule/adapters/inbound/facades/open-slots-facade-adapter.server";
import { PostgresCoachAvailabilityRepository } from "~/bounded-contexts/scheduling/coach-schedule/adapters/outbound/persistence/availability/postgres-coach-availability-repository.server";
import { PostgresCoachMeetingRoomRepository } from "~/bounded-contexts/scheduling/coach-schedule/adapters/outbound/persistence/meeting-room/postgres-coach-meeting-room-repository.server";
import { PostgresCoachTimeReservationsRepository } from "~/bounded-contexts/scheduling/coach-schedule/adapters/outbound/persistence/reservations/postgres-coach-time-reservations-repository.server";
import { PostgresCoachCalendarRepository } from "~/bounded-contexts/scheduling/coach-schedule/adapters/outbound/persistence/reservations/postgres-coach-calendar-repository.server";
import type { CoachScheduleFeature } from "~/bounded-contexts/scheduling/coach-schedule/adapters/inbound/http/context.server";

type CoachScheduleComposition = {
  feature: CoachScheduleFeature;
  handles: {
    coachTimeReservationsPort: CoachTimeReservationsPort;
    coachMeetingRoomSourcePort: CoachMeetingRoomSourcePort;
    openings: CoachOpenings;
  };
  facades: {
    coachTimeFacade: CoachTimeFacade;
    meetingRoomFacade: MeetingRoomFacade;
    openSlotsFacade: OpenSlotsFacade;
  };
};

type CoachScheduleFeatureHandles = {
  clockPort: ClockPort;
  database: DatabaseClient;
};

export function composeCoachScheduleFeature(
  handles: CoachScheduleFeatureHandles,
): CoachScheduleComposition {
  const postgresCoachAvailabilityRepository =
    new PostgresCoachAvailabilityRepository(handles);
  const postgresCoachMeetingRoomRepository =
    new PostgresCoachMeetingRoomRepository(handles);
  const postgresCoachTimeReservationsRepository =
    new PostgresCoachTimeReservationsRepository(handles.database);
  const openings = new CoachOpenings({
    coachAvailabilitySourcePort: postgresCoachAvailabilityRepository,
    coachCalendarPort: new PostgresCoachCalendarRepository(handles.database),
  });

  return {
    feature: {
      coachScheduleSettingsController: new CoachScheduleSettingsController({
        getCoachScheduleSettingsUseCase: new GetCoachScheduleSettingsUseCase({
          coachAvailabilitySourcePort: postgresCoachAvailabilityRepository,
          coachMeetingRoomSourcePort: postgresCoachMeetingRoomRepository,
        }),
        updateCoachScheduleSettingsUseCase:
          new UpdateCoachScheduleSettingsUseCase({
            coachAvailabilityChangesPort: postgresCoachAvailabilityRepository,
            coachMeetingRoomChangesPort: postgresCoachMeetingRoomRepository,
          }),
      }),
    },
    handles: {
      coachTimeReservationsPort: postgresCoachTimeReservationsRepository,
      coachMeetingRoomSourcePort: postgresCoachMeetingRoomRepository,
      openings,
    },
    facades: {
      coachTimeFacade: new CoachTimeFacadeAdapter(
        postgresCoachTimeReservationsRepository,
      ),
      meetingRoomFacade: new MeetingRoomFacadeAdapter(
        postgresCoachMeetingRoomRepository,
      ),
      openSlotsFacade: new OpenSlotsFacadeAdapter(openings),
    },
  };
}
