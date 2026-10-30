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
  clientIdentities: ClientIdentitiesPort;
  clientReach: ClientReachPort;
  clock: ClockPort;
  coachEmail: string;
  coachTime: CoachTimeFacade;
  contactEmail: string;
  database: DatabaseClient;
  inbox: NotificationInboxPort;
  logger: LoggerPort;
  meetingRoom: MeetingRoomFacade;
  openSlots: OpenSlotsFacade;
  productEmail: ProductEmailPort;
  publicAppUrl: string;
};

type CheckInsComposition = {
  facades: { coachingPeriods: CoachingPeriodsFacade };
  feature: CheckInsFeature;
};

export function composeCheckInsFeature(
  handles: CheckInsFeatureHandles,
): CheckInsComposition {
  const incidents = new CheckInsIncidentsAdapter(handles.logger);
  const { clock } = handles;
  const unitOfWork = createUnitOfWork(handles.database);
  const checkIns = new PostgresCheckInsRepository(handles.database);
  const coachTime = new SchedulingCoachTimeAdapter(handles.coachTime);
  const openSlots = new SchedulingOpenSlotsAdapter({
    openSlots: handles.openSlots,
    rules: CHECK_IN_RULES,
  });
  const clients = new ClientsClientReachAdapter(handles.clientReach);
  const inbox = new InboxCheckInNoticesAdapter({ clock, inbox: handles.inbox });
  const cancelCheckInsAfterCoachingEnd =
    new CancelCheckInsAfterCoachingEndUseCase({
      checkIns,
      clock,
      coachTime,
      inbox,
      incidents,
    });
  const readPorts = {
    checkIns,
    clients,
    clock,
    identities: new ClientsClientIdentitiesAdapter(handles.clientIdentities),
  };
  const answerPorts = {
    ...readPorts,
    coachTime,
    inbox,
    incidents,
    notifications: new EmailCheckInNotificationsAdapter(handles.productEmail, {
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
    ids: new RandomCheckInIdsAdapter(),
    openSlots,
  };
  const seriesPorts = {
    ...requestPorts,
    series: new PostgresCheckInSeriesRepository(handles.database),
  };
  const extendCheckInSeries = new ExtendCheckInSeriesUseCase(seriesPorts);

  return {
    facades: {
      coachingPeriods: new CoachingPeriodsFacadeAdapter({
        cancelCheckInsAfterCoachingEnd,
        extendCheckInSeries,
        incidents,
        unitOfWork,
      }),
    },
    feature: {
      checkInJoin: new CheckInJoinController({
        resolveCheckInJoin: new ResolveCheckInJoinUseCase({
          ...readPorts,
          meetingRoom: new SchedulingMeetingRoomAdapter(handles.meetingRoom),
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
        previewCheckInSeries: new PreviewCheckInSeriesUseCase(seriesPorts),
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
          clients,
          clock,
          openSlots,
        }),
        proposeCheckInTime: new ProposeCheckInTimeUseCase({
          ...answerPorts,
          openSlots,
        }),
        withdrawCheckInRequest: new WithdrawCheckInRequestUseCase(answerPorts),
        unitOfWork,
      }),
    },
  };
}
