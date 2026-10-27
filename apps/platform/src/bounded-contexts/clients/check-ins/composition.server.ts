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
  ClientIdentities,
  ClientReach,
} from "~/bounded-contexts/clients/clients/public";
import type { NotificationInbox } from "~/bounded-contexts/clients/notifications/public";
import type { CoachingPeriodsFacade } from "~/bounded-contexts/clients/public/coaching-periods";
import type { CoachTimeFacade } from "~/bounded-contexts/scheduling/public/coach-time";
import type { MeetingRoomFacade } from "~/bounded-contexts/scheduling/public/meeting-room";
import type { OpenSlotsFacade } from "~/bounded-contexts/scheduling/public/open-slots";
import type { Clock } from "~/bounded-contexts/clients/check-ins/domain/clock";
import type { ProductEmail } from "~/shared/email/index.server";

import { ClientCheckInsController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/client/client-check-ins-controller.server";
import { CoachCheckInSeriesController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/coach/coach-check-in-series-controller.server";
import { CoachCheckInsController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/coach/coach-check-ins-controller.server";
import { CheckInJoinController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/join/check-in-join-controller.server";
import { SharedCheckInsController } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/shared/shared-check-ins-controller.server";
import { PostgresCheckIns } from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/check-ins/postgres-check-ins.server";
import { SchedulingCoachTime } from "~/bounded-contexts/clients/check-ins/adapters/outbound/scheduling/coach-time.server";
import { SchedulingMeetingRoom } from "~/bounded-contexts/clients/check-ins/adapters/outbound/scheduling/meeting-room.server";
import { SchedulingOpenSlots } from "~/bounded-contexts/clients/check-ins/adapters/outbound/scheduling/open-slots.server";
import { RandomCheckInIds } from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/check-ins/random-check-in-ids.server";
import { InboxCheckInNotices } from "~/bounded-contexts/clients/check-ins/adapters/outbound/notifications/inbox-check-in-notices.server";
import { ClientsClientIdentities } from "~/bounded-contexts/clients/check-ins/adapters/outbound/clients/client-identities.server";
import { ClientsClientReach } from "~/bounded-contexts/clients/check-ins/adapters/outbound/clients/client-reach.server";
import { createCoachingPeriodsFacade } from "~/bounded-contexts/clients/check-ins/adapters/inbound/facades/coaching-periods.server";
import { PostgresCheckInSeries } from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/series/postgres-check-in-series.server";
import { EmailCheckInNotifications } from "~/bounded-contexts/clients/check-ins/adapters/outbound/email/email-check-in-notifications.server";
import type { CheckInsFeature } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/context.server";
import type { Logger } from "~/shared/logging/console-logger.server";
import { createCheckInsIncidents } from "~/bounded-contexts/clients/check-ins/adapters/outbound/logging/check-ins-incidents.server";

type CheckInsFeatureHandles = {
  appBasePath: string;
  clientIdentities: ClientIdentities;
  clientReach: ClientReach;
  clock: Clock;
  coachEmail: string;
  coachTime: CoachTimeFacade;
  contactEmail: string;
  database: DatabaseClient;
  inbox: NotificationInbox;
  logger: Logger;
  meetingRoom: MeetingRoomFacade;
  openSlots: OpenSlotsFacade;
  productEmail: ProductEmail;
  publicAppUrl: string;
};

type CheckInsComposition = {
  facades: { coachingPeriods: CoachingPeriodsFacade };
  feature: CheckInsFeature;
};

export function composeCheckInsFeature(
  handles: CheckInsFeatureHandles,
): CheckInsComposition {
  const incidents = createCheckInsIncidents(handles.logger);
  const { clock } = handles;
  const unitOfWork = createUnitOfWork(handles.database);
  const checkIns = new PostgresCheckIns(handles.database);
  const coachTime = new SchedulingCoachTime(handles.coachTime);
  const openSlots = new SchedulingOpenSlots({
    openSlots: handles.openSlots,
    rules: CHECK_IN_RULES,
  });
  const clients = new ClientsClientReach(handles.clientReach);
  const inbox = new InboxCheckInNotices({ clock, inbox: handles.inbox });
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
    identities: new ClientsClientIdentities(handles.clientIdentities),
  };
  const answerPorts = {
    ...readPorts,
    coachTime,
    inbox,
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
    ids: new RandomCheckInIds(),
    openSlots,
  };
  const seriesPorts = {
    ...requestPorts,
    series: new PostgresCheckInSeries(handles.database),
  };
  const extendCheckInSeries = new ExtendCheckInSeriesUseCase(seriesPorts);

  return {
    facades: {
      coachingPeriods: createCoachingPeriodsFacade({
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
          meetingRoom: new SchedulingMeetingRoom(handles.meetingRoom),
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
