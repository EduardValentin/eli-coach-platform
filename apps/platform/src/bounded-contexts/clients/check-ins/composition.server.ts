import type { DatabaseClient } from "~/shared/database";
import { createUnitOfWork } from "~/shared/database/index.server";
import {
  CHECK_IN_RULES,
  ApproveCheckInUseCase,
  CancelCheckInsAfterCoachingEndUseCase,
  CancelCheckInUseCase,
  ChangeCheckInSeriesUseCase,
  CountCheckInsAwaitingUseCase,
  DeclineCheckInUseCase,
  ExtendCheckInSeriesUseCase,
  FindNextClientCheckInUseCase,
  ListClientCheckInsUseCase,
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
  ClientIdentitiesPort,
  ClientReachPort,
} from "~/bounded-contexts/clients/clients/public";
import type { NotificationInboxPort } from "~/bounded-contexts/clients/notifications/public";
import type { CoachingPeriodsFacade } from "~/bounded-contexts/clients/public/coaching-periods-facade";
import type { CoachTimeFacade } from "~/bounded-contexts/scheduling/public/coach-time-facade";
import type { MeetingRoomFacade } from "~/bounded-contexts/scheduling/public/meeting-room-facade";
import type { OpenSlotsFacade } from "~/bounded-contexts/scheduling/public/open-slots-facade";
import type { ClockPort } from "~/bounded-contexts/clients/check-ins/domain/clock-port";
import type { ProductEmailPort } from "~/shared/email/index.server";

import { ClientCheckInsController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/client/client-check-ins-controller.server";
import { CoachCheckInSeriesController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/coach/coach-check-in-series-controller.server";
import { CoachCheckInsController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/coach/coach-check-ins-controller.server";
import { CheckInJoinController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/join/check-in-join-controller.server";
import { SharedCheckInsController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/shared/shared-check-ins-controller.server";
import { PostgresCheckInsRepository } from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/check-ins/postgres-check-ins-repository.server";
import { SchedulingCoachTimeAdapter } from "~/bounded-contexts/clients/check-ins/adapters/outbound/scheduling/scheduling-coach-time-adapter.server";
import { SchedulingMeetingRoomAdapter } from "~/bounded-contexts/clients/check-ins/adapters/outbound/scheduling/scheduling-meeting-room-adapter.server";
import { SchedulingOpenSlotsAdapter } from "~/bounded-contexts/clients/check-ins/adapters/outbound/scheduling/scheduling-open-slots-adapter.server";
import { RandomCheckInIdsAdapter } from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/check-ins/random-check-in-ids-adapter.server";
import { InboxCheckInNoticesAdapter } from "~/bounded-contexts/clients/check-ins/adapters/outbound/notifications/inbox-check-in-notices-adapter.server";
import { ClientsClientIdentitiesAdapter } from "~/bounded-contexts/clients/check-ins/adapters/outbound/clients/clients-client-identities-adapter.server";
import { ClientsClientReachAdapter } from "~/bounded-contexts/clients/check-ins/adapters/outbound/clients/clients-client-reach-adapter.server";
import { CoachingPeriodsFacadeAdapter } from "~/bounded-contexts/clients/check-ins/adapters/inbound/facades/coaching-periods-facade-adapter.server";
import { PostgresCheckInSeriesRepository } from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/series/postgres-check-in-series-repository.server";
import { EmailCheckInNotificationsAdapter } from "~/bounded-contexts/clients/check-ins/adapters/outbound/email/email-check-in-notifications-adapter.server";
import type { CheckInsFeature } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/context.server";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import { CheckInsIncidentsAdapter } from "~/bounded-contexts/clients/check-ins/adapters/outbound/logging/check-ins-incidents-adapter.server";

type CheckInsFeatureHandles = {
  appBasePath: string;
  clientIdentitiesPort: ClientIdentitiesPort;
  clientReachPort: ClientReachPort;
  clockPort: ClockPort;
  coachEmail: string;
  coachTimeFacade: CoachTimeFacade;
  contactEmail: string;
  database: DatabaseClient;
  notificationInboxPort: NotificationInboxPort;
  loggerPort: LoggerPort;
  meetingRoomFacade: MeetingRoomFacade;
  openSlotsFacade: OpenSlotsFacade;
  productEmailPort: ProductEmailPort;
  publicAppUrl: string;
};

type CheckInsComposition = {
  facades: { coachingPeriodsFacade: CoachingPeriodsFacade };
  feature: CheckInsFeature;
};

export function composeCheckInsFeature(
  handles: CheckInsFeatureHandles,
): CheckInsComposition {
  const checkInsIncidentsAdapter = new CheckInsIncidentsAdapter(
    handles.loggerPort,
  );
  const { clockPort } = handles;
  const unitOfWork = createUnitOfWork(handles.database);
  const postgresCheckInsRepository = new PostgresCheckInsRepository(
    handles.database,
  );
  const schedulingCoachTimeAdapter = new SchedulingCoachTimeAdapter(
    handles.coachTimeFacade,
  );
  const schedulingOpenSlotsAdapter = new SchedulingOpenSlotsAdapter({
    openSlotsFacade: handles.openSlotsFacade,
    rules: CHECK_IN_RULES,
  });
  const clientsClientReachAdapter = new ClientsClientReachAdapter(
    handles.clientReachPort,
  );
  const inboxCheckInNoticesAdapter = new InboxCheckInNoticesAdapter({
    clockPort,
    notificationInboxPort: handles.notificationInboxPort,
  });
  const cancelCheckInsAfterCoachingEndUseCase =
    new CancelCheckInsAfterCoachingEndUseCase({
      checkInsPort: postgresCheckInsRepository,
      clockPort,
      coachTimePort: schedulingCoachTimeAdapter,
      checkInInboxPort: inboxCheckInNoticesAdapter,
      checkInIncidentsPort: checkInsIncidentsAdapter,
    });
  const readPorts = {
    checkInsPort: postgresCheckInsRepository,
    clientReachPort: clientsClientReachAdapter,
    clockPort,
    clientIdentitiesPort: new ClientsClientIdentitiesAdapter(
      handles.clientIdentitiesPort,
    ),
  };
  const answerPorts = {
    ...readPorts,
    coachTimePort: schedulingCoachTimeAdapter,
    checkInInboxPort: inboxCheckInNoticesAdapter,
    checkInIncidentsPort: checkInsIncidentsAdapter,
    checkInNotificationsPort: new EmailCheckInNotificationsAdapter(
      handles.productEmailPort,
      {
        appBasePath: handles.appBasePath,
        clockPort,
        coachEmail: handles.coachEmail,
        contactEmail: handles.contactEmail,
        publicAppUrl: handles.publicAppUrl,
      },
    ),
  };
  const observedReadPorts = {
    ...readPorts,
    checkInIncidentsPort: checkInsIncidentsAdapter,
  };
  const countCheckInsAwaitingUseCase = new CountCheckInsAwaitingUseCase(
    observedReadPorts,
  );
  const requestPorts = {
    ...answerPorts,
    checkInIdsPort: new RandomCheckInIdsAdapter(),
    openSlotsPort: schedulingOpenSlotsAdapter,
  };
  const seriesPorts = {
    ...requestPorts,
    checkInSeriesRecordsPort: new PostgresCheckInSeriesRepository(
      handles.database,
    ),
  };
  const extendCheckInSeriesUseCase = new ExtendCheckInSeriesUseCase(
    seriesPorts,
  );

  return {
    facades: {
      coachingPeriodsFacade: new CoachingPeriodsFacadeAdapter({
        cancelCheckInsAfterCoachingEndUseCase,
        extendCheckInSeriesUseCase,
        checkInIncidentsPort: checkInsIncidentsAdapter,
        unitOfWork,
      }),
    },
    feature: {
      checkInJoinController: new CheckInJoinController({
        resolveCheckInJoinUseCase: new ResolveCheckInJoinUseCase({
          ...readPorts,
          meetingRoomPort: new SchedulingMeetingRoomAdapter(
            handles.meetingRoomFacade,
          ),
        }),
      }),
      clientCheckInsController: new ClientCheckInsController({
        countCheckInsAwaitingUseCase,
        findNextClientCheckInUseCase: new FindNextClientCheckInUseCase(
          observedReadPorts,
        ),
        listClientCheckInsUseCase: new ListClientCheckInsUseCase(readPorts),
        requestCheckInUseCase: new RequestCheckInUseCase(requestPorts),
        unitOfWork,
      }),
      coachCheckInsController: new CoachCheckInsController({
        countCheckInsAwaitingUseCase,
        listCoachCheckInsUseCase: new ListCoachCheckInsUseCase(readPorts),
        listCoachCheckInsAwaitingUseCase: new ListCoachCheckInsAwaitingUseCase(
          observedReadPorts,
        ),
        readClientCheckInSchedulingUseCase:
          new ReadClientCheckInSchedulingUseCase(readPorts),
        scheduleCheckInUseCase: new ScheduleCheckInUseCase(requestPorts),
        unitOfWork,
      }),
      coachCheckInSeriesController: new CoachCheckInSeriesController({
        changeCheckInSeriesUseCase: new ChangeCheckInSeriesUseCase(seriesPorts),
        previewCheckInSeriesUseCase: new PreviewCheckInSeriesUseCase(
          seriesPorts,
        ),
        readCoachClientSeriesUseCase: new ReadCoachClientSeriesUseCase(
          seriesPorts,
        ),
        setUpCheckInSeriesUseCase: new SetUpCheckInSeriesUseCase(seriesPorts),
        stopCheckInSeriesUseCase: new StopCheckInSeriesUseCase(seriesPorts),
        unitOfWork,
      }),
      sharedCheckInsController: new SharedCheckInsController({
        approveCheckInUseCase: new ApproveCheckInUseCase(answerPorts),
        cancelCheckInUseCase: new CancelCheckInUseCase(answerPorts),
        declineCheckInUseCase: new DeclineCheckInUseCase(answerPorts),
        listOpenCheckInTimesUseCase: new ListOpenCheckInTimesUseCase({
          clientReachPort: clientsClientReachAdapter,
          clockPort,
          openSlotsPort: schedulingOpenSlotsAdapter,
        }),
        proposeCheckInTimeUseCase: new ProposeCheckInTimeUseCase({
          ...answerPorts,
          openSlotsPort: schedulingOpenSlotsAdapter,
        }),
        withdrawCheckInRequestUseCase: new WithdrawCheckInRequestUseCase(
          answerPorts,
        ),
        unitOfWork,
      }),
    },
  };
}
