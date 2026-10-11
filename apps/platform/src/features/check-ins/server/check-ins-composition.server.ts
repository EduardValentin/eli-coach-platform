import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  ApproveCheckInUseCase,
  CancelCheckInsAfterCoachingEndUseCase,
  CancelCheckInUseCase,
  DeclineCheckInUseCase,
  ListClientCheckInsUseCase,
  ListCoachCheckInsUseCase,
  ListOpenCheckInTimesUseCase,
  ProposeCheckInTimeUseCase,
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
import type { CoachingEndHandler } from "@eli-coach-platform/domain/coaching-subscription";
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

type CheckInsFoundationHandles = {
  clock: Clock;
  coachTime: CheckInCoachTime;
  database: DatabaseClient;
};

type CheckInsFeatureHandles = {
  appBasePath: string;
  availability: CoachAvailabilitySource;
  calendar: CoachCalendar;
  checkInClients: CheckInClients;
  coachEmail: string;
  contactEmail: string;
  incidents: CheckInIncidents;
  meetingRoom: CoachMeetingRoomSource;
  productEmail: ProductEmail;
  publicAppUrl: string;
};

type CheckInsComposition = {
  handles: { coachingEndHandler: CoachingEndHandler };
  complete: (handles: CheckInsFeatureHandles) => CheckInsFeature;
};

export function composeCheckInsFeature(
  foundation: CheckInsFoundationHandles,
): CheckInsComposition {
  const { clock } = foundation;
  const checkIns = new PostgresCheckIns({
    coachTime: foundation.coachTime,
    database: foundation.database,
  });
  const cancelCheckInsAfterCoachingEnd =
    new CancelCheckInsAfterCoachingEndUseCase({ checkIns, clock });

  return {
    handles: {
      coachingEndHandler: {
        coachingEnds: async (notice) => {
          await cancelCheckInsAfterCoachingEnd.execute(notice);
        },
      },
    },
    complete: (handles) => {
      const { availability } = handles;
      const readPorts = { checkIns, clients: handles.checkInClients, clock };
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
          cancelCheckIn: new CancelCheckInUseCase(answerPorts),
          declineCheckIn: new DeclineCheckInUseCase(answerPorts),
          listOpenCheckInTimes: new ListOpenCheckInTimesUseCase({
            availability,
            calendar: handles.calendar,
            clients: handles.checkInClients,
            clock,
          }),
          proposeCheckInTime: new ProposeCheckInTimeUseCase({
            ...answerPorts,
            availability,
          }),
          withdrawCheckInRequest: new WithdrawCheckInRequestUseCase(
            answerPorts,
          ),
        }),
      };
    },
  };
}
