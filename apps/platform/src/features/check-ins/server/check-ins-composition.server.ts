import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  ApproveCheckInUseCase,
  CancelCheckInsAfterCoachingEndUseCase,
  CancelCheckInUseCase,
  CountCheckInsAwaitingUseCase,
  DeclineCheckInUseCase,
  FindNextClientCheckInUseCase,
  ListClientCheckInsUseCase,
  ListCoachCheckInsAwaitingUseCase,
  ListCoachCheckInsUseCase,
  ListOpenCheckInTimesUseCase,
  ProposeCheckInTimeUseCase,
  ReadClientCheckInSchedulingUseCase,
  RequestCheckInUseCase,
  ResolveCheckInJoinUseCase,
  ScheduleCheckInUseCase,
  WithdrawCheckInRequestUseCase,
  type CheckInIncidents,
} from "@eli-coach-platform/domain/check-in";
import type {
  ClientIdentities,
  ClientReach,
} from "@eli-coach-platform/domain/client";
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

type CheckInsFeatureHandles = {
  appBasePath: string;
  availability: CoachAvailabilitySource;
  calendar: CoachCalendar;
  clientIdentities: Pick<ClientIdentities, "findByClientIds">;
  clientReach: Pick<ClientReach, "findByAuthSubjectId" | "findById">;
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

type CheckInsComposition = {
  feature: CheckInsFeature;
  handles: { coachingEndHandler: CoachingEndHandler };
};

export function composeCheckInsFeature(
  handles: CheckInsFeatureHandles,
): CheckInsComposition {
  const { availability, clock } = handles;
  const checkIns = new PostgresCheckIns({
    coachTime: handles.coachTime,
    database: handles.database,
  });
  const cancelCheckInsAfterCoachingEnd =
    new CancelCheckInsAfterCoachingEndUseCase({ checkIns, clock });
  const readPorts = {
    checkIns,
    clients: handles.clientReach,
    clock,
    identities: handles.clientIdentities,
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
  const observedReadPorts = { ...readPorts, incidents: handles.incidents };
  const countCheckInsAwaiting = new CountCheckInsAwaitingUseCase(
    observedReadPorts,
  );
  const requestPorts = {
    ...answerPorts,
    availability,
    ids: new RandomCheckInIds(),
  };

  return {
    feature: {
      checkInJoin: new CheckInJoinController({
        resolveCheckInJoin: new ResolveCheckInJoinUseCase({
          ...readPorts,
          meetingRoom: handles.meetingRoom,
        }),
      }),
      clientCheckIns: new ClientCheckInsController({
        countCheckInsAwaiting,
        findNextClientCheckIn: new FindNextClientCheckInUseCase(
          observedReadPorts,
        ),
        listClientCheckIns: new ListClientCheckInsUseCase(readPorts),
        requestCheckIn: new RequestCheckInUseCase(requestPorts),
      }),
      coachCheckIns: new CoachCheckInsController({
        countCheckInsAwaiting,
        listCoachCheckIns: new ListCoachCheckInsUseCase(readPorts),
        listCoachCheckInsAwaiting: new ListCoachCheckInsAwaitingUseCase(
          observedReadPorts,
        ),
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
          clients: handles.clientReach,
          clock,
        }),
        proposeCheckInTime: new ProposeCheckInTimeUseCase({
          ...answerPorts,
          availability,
        }),
        withdrawCheckInRequest: new WithdrawCheckInRequestUseCase(answerPorts),
      }),
    },
    handles: {
      coachingEndHandler: {
        coachingEnds: async (notice) => {
          await cancelCheckInsAfterCoachingEnd.execute(notice);
        },
      },
    },
  };
}
