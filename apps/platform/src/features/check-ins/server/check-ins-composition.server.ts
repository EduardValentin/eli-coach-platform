import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  ApproveCheckInUseCase,
  DeclineCheckInUseCase,
  ListClientCheckInsUseCase,
  ListCoachCheckInsUseCase,
  ListOpenCheckInTimesUseCase,
  RequestCheckInUseCase,
  ResolveCheckInJoinUseCase,
  WithdrawCheckInRequestUseCase,
  type CheckInClients,
  type CheckInIncidents,
} from "@eli-coach-platform/domain/check-in";
import type { Clock } from "@eli-coach-platform/domain/shared";
import {
  PostgresCoachAvailability,
  PostgresCoachCalendar,
} from "@eli-coach-platform/infrastructure/coach-calendar/server";
import { PostgresCoachMeetingRoom } from "@eli-coach-platform/infrastructure/coach-meeting-room/server";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import { ClientCheckInsController } from "~/features/check-ins/api/client/client-check-ins-controller.server";
import { CoachCheckInsController } from "~/features/check-ins/api/coach/coach-check-ins-controller.server";
import { CheckInJoinController } from "~/features/check-ins/api/join/check-in-join-controller.server";
import { PostgresCheckIns } from "~/features/check-ins/data/check-ins/postgres-check-ins.server";
import { RandomCheckInIds } from "~/features/check-ins/data/check-ins/random-check-in-ids.server";
import { createCheckInNotifications } from "~/features/check-ins/email/create-check-in-notifications.server";

export type CheckInsFeature = {
  checkInJoin: CheckInJoinController;
  clientCheckIns: ClientCheckInsController;
  coachCheckIns: CoachCheckInsController;
};

type CheckInsFeatureHandles = {
  appBasePath: string;
  checkInClients: CheckInClients;
  clock: Clock;
  coachEmail: string;
  contactEmail: string;
  database: DatabaseClient;
  incidents: CheckInIncidents;
  productEmail: ProductEmail;
  publicAppUrl: string;
};

export function composeCheckInsFeature(
  handles: CheckInsFeatureHandles,
): CheckInsFeature {
  const { clock, database } = handles;
  const availability = new PostgresCoachAvailability({ clock, database });
  const readPorts = {
    checkIns: new PostgresCheckIns(database),
    clients: handles.checkInClients,
    clock,
  };
  const answerPorts = {
    ...readPorts,
    incidents: handles.incidents,
    notifications: createCheckInNotifications(handles.productEmail, {
      appBasePath: handles.appBasePath,
      clock,
      coachEmail: handles.coachEmail,
      contactEmail: handles.contactEmail,
      publicAppUrl: handles.publicAppUrl,
    }),
  };

  return {
    checkInJoin: new CheckInJoinController({
      resolveCheckInJoin: new ResolveCheckInJoinUseCase({
        ...readPorts,
        meetingRoom: new PostgresCoachMeetingRoom({ clock, database }),
      }),
    }),
    clientCheckIns: new ClientCheckInsController({
      listClientCheckIns: new ListClientCheckInsUseCase(readPorts),
      listOpenCheckInTimes: new ListOpenCheckInTimesUseCase({
        availability,
        calendar: new PostgresCoachCalendar(database),
        clock,
      }),
      requestCheckIn: new RequestCheckInUseCase({
        ...answerPorts,
        availability,
        ids: new RandomCheckInIds(),
      }),
      withdrawCheckInRequest: new WithdrawCheckInRequestUseCase(answerPorts),
    }),
    coachCheckIns: new CoachCheckInsController({
      approveCheckIn: new ApproveCheckInUseCase(answerPorts),
      declineCheckIn: new DeclineCheckInUseCase(answerPorts),
      listCoachCheckIns: new ListCoachCheckInsUseCase(readPorts),
    }),
  };
}
