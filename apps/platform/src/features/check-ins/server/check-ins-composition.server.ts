import type { DatabaseClient } from "~/shared/database";
import {
  ApproveCheckInUseCase,
  CancelCheckInsAfterCoachingEndUseCase,
  CancelCheckInUseCase,
  ChangeCheckInSeriesUseCase,
  CountCheckInsAwaitingUseCase,
  DeclineCheckInUseCase,
  ExtendCheckInSeriesUseCase,
  FindNextClientCheckInUseCase,
  ListClientCheckInsUseCase,
  ListLapsedCheckInsUseCase,
  ListCoachCheckInsAwaitingUseCase,
  ListCoachCheckInsUseCase,
  ListOpenCheckInTimesUseCase,
  PreviewCheckInSeriesUseCase,
  ProposeCheckInTimeUseCase,
  ReadClientCheckInSchedulingUseCase,
  ReadCoachClientSeriesUseCase,
  RequestCheckInUseCase,
  ResolveCheckInJoinUseCase,
  ScheduleCheckInUseCase,
  SetUpCheckInSeriesUseCase,
  StopCheckInSeriesUseCase,
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
import type {
  CoachingEndHandler,
  CoachingPeriodHandler,
} from "@eli-coach-platform/domain/coaching-subscription";
import type {
  NotificationExpirySource,
  NotificationInbox,
} from "@eli-coach-platform/domain/notification";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import { ClientCheckInsController } from "~/features/check-ins/api/client/client-check-ins-controller.server";
import { CoachCheckInSeriesController } from "~/features/check-ins/api/coach/coach-check-in-series-controller.server";
import { CoachCheckInsController } from "~/features/check-ins/api/coach/coach-check-ins-controller.server";
import { CheckInJoinController } from "~/features/check-ins/api/join/check-in-join-controller.server";
import { SharedCheckInsController } from "~/features/check-ins/api/shared/shared-check-ins-controller.server";
import {
  PostgresCheckIns,
  type CheckInCoachTime,
} from "~/features/check-ins/data/check-ins/postgres-check-ins.server";
import { RandomCheckInIds } from "~/features/check-ins/data/check-ins/random-check-in-ids.server";
import { CheckInExpiryNotifications } from "~/features/check-ins/data/inbox/check-in-expiry-notifications.server";
import { InboxCheckInNotices } from "~/features/check-ins/data/inbox/inbox-check-in-notices.server";
import { PostgresCheckInSeries } from "~/features/check-ins/data/series/postgres-check-in-series.server";
import { EmailCheckInNotifications } from "~/features/check-ins/email/email-check-in-notifications.server";

export type CheckInsFeature = {
  checkInJoin: CheckInJoinController;
  clientCheckIns: ClientCheckInsController;
  coachCheckIns: CoachCheckInsController;
  coachCheckInSeries: CoachCheckInSeriesController;
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
  inbox: Pick<NotificationInbox, "record">;
  incidents: CheckInIncidents;
  meetingRoom: CoachMeetingRoomSource;
  productEmail: ProductEmail;
  publicAppUrl: string;
};

type CheckInsComposition = {
  feature: CheckInsFeature;
  handles: {
    coachingEndHandler: CoachingEndHandler;
    coachingPeriodHandler: CoachingPeriodHandler;
    expirySource: NotificationExpirySource;
  };
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
    inbox: new InboxCheckInNotices({ clock, inbox: handles.inbox }),
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
  const seriesPorts = {
    ...requestPorts,
    series: new PostgresCheckInSeries({
      coachTime: handles.coachTime,
      database: handles.database,
    }),
  };
  const extendCheckInSeries = new ExtendCheckInSeriesUseCase(seriesPorts);

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
      coachCheckInSeries: new CoachCheckInSeriesController({
        changeCheckInSeries: new ChangeCheckInSeriesUseCase(seriesPorts),
        previewCheckInSeries: new PreviewCheckInSeriesUseCase({
          ...seriesPorts,
          calendar: handles.calendar,
        }),
        readCoachClientSeries: new ReadCoachClientSeriesUseCase(seriesPorts),
        setUpCheckInSeries: new SetUpCheckInSeriesUseCase(seriesPorts),
        stopCheckInSeries: new StopCheckInSeriesUseCase(seriesPorts),
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
      coachingPeriodHandler: {
        paidThroughExtended: async ({ clientId }) => {
          await extendCheckInSeries.execute({ clientId });
        },
        programStarted: async ({ clientId }) => {
          await extendCheckInSeries.execute({ clientId });
        },
      },
      expirySource: new CheckInExpiryNotifications({
        listLapsedCheckIns: new ListLapsedCheckInsUseCase({
          checkIns,
          identities: handles.clientIdentities,
        }),
      }),
    },
  };
}
