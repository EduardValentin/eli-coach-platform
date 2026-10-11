import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  ApproveCheckInUseCase,
  DeclineCheckInUseCase,
  ListClientCheckInsUseCase,
  ListCoachCheckInsUseCase,
  ListOpenCheckInTimesUseCase,
  ReadClientCheckInSchedulingUseCase,
  RequestCheckInUseCase,
  ResolveCheckInJoinUseCase,
  ScheduleCheckInUseCase,
  WithdrawCheckInRequestUseCase,
  type CheckInClients,
  type CheckInIncidents,
} from "@eli-coach-platform/domain/check-in";
import type {
  CoachAvailabilitySource,
  CoachCalendar,
} from "@eli-coach-platform/domain/coach-availability";
import type { CoachMeetingRoomSource } from "@eli-coach-platform/domain/coach-meeting-room";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import { ClientCheckInsController } from "~/features/check-ins/api/client/client-check-ins-controller.server";
import { CoachCheckInsController } from "~/features/check-ins/api/coach/coach-check-ins-controller.server";
import { CheckInJoinController } from "~/features/check-ins/api/join/check-in-join-controller.server";
import { SharedCheckInsController } from "~/features/check-ins/api/shared/shared-check-ins-controller.server";
import {
  PostgresCheckIns,
  type CheckInCoachTime,
} from "~/features/check-ins/data/check-ins/postgres-check-ins.server";
import { RandomCheckInIds } from "~/features/check-ins/data/check-ins/random-check-in-ids.server";
import { EmailCheckInNotifications } from "~/features/check-ins/email/email-check-in-notifications.server";

export type CheckInsFeature = {
  checkInJoin: CheckInJoinController;
  clientCheckIns: ClientCheckInsController;
  coachCheckIns: CoachCheckInsController;
  sharedCheckIns: SharedCheckInsController;
};

type CheckInsFeatureHandles = {
  appBasePath: string;
  availability: CoachAvailabilitySource;
  calendar: CoachCalendar;
  checkInClients: CheckInClients;
  clock: Clock;
  coachEmail: string;
  coachTime: CheckInCoachTime;
  contactEmail: string;
  database: DatabaseClient;
  incidents: CheckInIncidents;
  meetingRoom: CoachMeetingRoomSource;
  productEmail: ProductEmail;
  publicAppUrl: string;
};

export function composeCheckInsFeature(
  handles: CheckInsFeatureHandles,
): CheckInsFeature {
  const { availability, clock } = handles;
  const readPorts = {
    checkIns: new PostgresCheckIns({
      coachTime: handles.coachTime,
      database: handles.database,
    }),
    clients: handles.checkInClients,
    clock,
  };
  const answerPorts = {
    ...readPorts,
    incidents: handles.incidents,
    notifications: new EmailCheckInNotifications(handles.productEmail, {
      appBasePath: handles.appBasePath,
      clock,
      coachEmail: handles.coachEmail,
      contactEmail: handles.contactEmail,
      publicAppUrl: handles.publicAppUrl,
    }),
  };

  const requestPorts = {
    ...answerPorts,
    availability,
    ids: new RandomCheckInIds(),
  };

  return {
    checkInJoin: new CheckInJoinController({
      resolveCheckInJoin: new ResolveCheckInJoinUseCase({
        ...readPorts,
        meetingRoom: handles.meetingRoom,
      }),
    }),
    clientCheckIns: new ClientCheckInsController({
      listClientCheckIns: new ListClientCheckInsUseCase(readPorts),
      requestCheckIn: new RequestCheckInUseCase(requestPorts),
    }),
    coachCheckIns: new CoachCheckInsController({
      listCoachCheckIns: new ListCoachCheckInsUseCase(readPorts),
      readClientCheckInScheduling: new ReadClientCheckInSchedulingUseCase(
        readPorts,
      ),
      scheduleCheckIn: new ScheduleCheckInUseCase(requestPorts),
    }),
    sharedCheckIns: new SharedCheckInsController({
      approveCheckIn: new ApproveCheckInUseCase(answerPorts),
      declineCheckIn: new DeclineCheckInUseCase(answerPorts),
      listOpenCheckInTimes: new ListOpenCheckInTimesUseCase({
        availability,
        calendar: handles.calendar,
        clock,
      }),
      withdrawCheckInRequest: new WithdrawCheckInRequestUseCase(answerPorts),
    }),
  };
}
