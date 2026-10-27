import type { DatabaseClient } from "~/shared/database";
import { createUnitOfWork } from "~/shared/database/index.server";
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
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type {
  ClientIdentities,
  ClientReach,
} from "~/bounded-contexts/clients/clients/domain/client";
import type {
  CoachAvailabilitySource,
  CoachCalendar,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import type { CoachMeetingRoomSource } from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-meeting-room";
import type {
  CoachingEndHandler,
  CoachingPeriodHandler,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type {
  NotificationExpirySource,
  NotificationInbox,
} from "~/bounded-contexts/clients/notifications/domain/notification";
import type { Clock } from "~/bounded-contexts/clients/check-ins/domain/clock";
import type { ProductEmail } from "~/shared/email/index.server";

import { ClientCheckInsController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/client/client-check-ins-controller.server";
import { CoachCheckInSeriesController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/coach/coach-check-in-series-controller.server";
import { CoachCheckInsController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/coach/coach-check-ins-controller.server";
import { CheckInJoinController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/join/check-in-join-controller.server";
import { SharedCheckInsController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/shared/shared-check-ins-controller.server";
import {
  PostgresCheckIns,
  type CheckInCoachTime,
} from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/check-ins/postgres-check-ins.server";
import { RandomCheckInIds } from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/check-ins/random-check-in-ids.server";
import { CheckInExpiryNotifications } from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/inbox/check-in-expiry-notifications.server";
import { InboxCheckInNotices } from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/inbox/inbox-check-in-notices.server";
import { PostgresCheckInSeries } from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/series/postgres-check-in-series.server";
import { EmailCheckInNotifications } from "~/bounded-contexts/clients/check-ins/adapters/outbound/email/email-check-in-notifications.server";
import type { CheckInsFeature } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/context.server";
import type { Logger } from "~/shared/logging/console-logger.server";
import { createCheckInsIncidents } from "~/bounded-contexts/clients/check-ins/adapters/outbound/logging/check-ins-incidents.server";

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
  logger: Logger;
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
  const incidents = createCheckInsIncidents(handles.logger);
  const { availability, clock } = handles;
  const unitOfWork = createUnitOfWork(handles.database);
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
    incidents,
    notifications: new EmailCheckInNotifications(handles.productEmail, {
      appBasePath: handles.appBasePath,
      clock,
      coachEmail: handles.coachEmail,
      contactEmail: handles.contactEmail,
      publicAppUrl: handles.publicAppUrl,
    }),
  };
  const observedReadPorts = { ...readPorts, incidents };
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
        unitOfWork,
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
        unitOfWork,
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
        unitOfWork,
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
        unitOfWork,
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
