import type { MiddlewareFunction } from "react-router";

import {
  clientsContext,
  type ClientsFeature,
} from "~/bounded-contexts/clients/clients/adapters/inbound/http/context.server";
import {
  composeClientsFeature,
  type ClientsFeatureHandles,
} from "~/bounded-contexts/clients/clients/composition.server";
import {
  clientOnboardingContext,
  clientProfileContext,
  type ClientOnboardingFeature,
  type ClientProfileFeature,
} from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/context.server";
import {
  composeClientOnboardingFeature,
  composeClientProfileFeature,
} from "~/bounded-contexts/clients/client-profile/composition.server";
import {
  clientResourcesContext,
  type ClientResourcesFeature,
} from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/context.server";
import { composeClientResourcesFeature } from "~/bounded-contexts/clients/client-resources/composition.server";
import {
  notificationsContext,
  type NotificationsFeature,
} from "~/bounded-contexts/clients/notifications/adapters/inbound/http/context.server";
import {
  composeNotificationInbox,
  composeNotificationsFeature,
} from "~/bounded-contexts/clients/notifications/composition.server";
import {
  checkInsContext,
  type CheckInsFeature,
} from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/context.server";
import { composeCheckInsFeature } from "~/bounded-contexts/clients/check-ins/composition.server";

type ClientsComponentHandles = ReturnType<
  typeof composeClientsFeature
>["handles"];
type ClientProfileComponentHandles = ReturnType<
  typeof composeClientProfileFeature
>["handles"];
type CheckInsComponentHandles = ReturnType<
  typeof composeCheckInsFeature
>["handles"];

export type ClientsHandles = ClientsFeatureHandles &
  Omit<
    Parameters<typeof composeClientProfileFeature>[0],
    "clientIdentities" | "clientReach"
  > &
  Omit<
    Parameters<typeof composeClientOnboardingFeature>[0],
    | keyof ClientsComponentHandles
    | keyof ClientProfileComponentHandles
    | "onboardingSubmissionStamps"
  > &
  Omit<Parameters<typeof composeClientResourcesFeature>[0], "clientReach"> &
  Omit<
    Parameters<typeof composeNotificationsFeature>[0],
    "clientReach" | "expirySources" | "inbox"
  > &
  Omit<
    Parameters<typeof composeCheckInsFeature>[0],
    "clientIdentities" | "clientReach" | "inbox"
  >;

export type ClientsComposition = {
  components: {
    checkIns: CheckInsFeature;
    clientOnboarding: ClientOnboardingFeature;
    clientProfile: ClientProfileFeature;
    clientResources: ClientResourcesFeature;
    clients: ClientsFeature;
    notifications: NotificationsFeature;
  };
  handles: Pick<
    ClientsComponentHandles,
    | "clientIdentities"
    | "clientIds"
    | "clientJourneys"
    | "clientReach"
    | "invitationAcceptance"
    | "paidClientAdmission"
    | "writeClient"
    | "writeCoachingStanding"
  > &
    Pick<
      CheckInsComponentHandles,
      "coachingEndHandler" | "coachingPeriodHandler"
    > &
    Pick<ClientProfileComponentHandles, "openClientProfile">;
  middleware: MiddlewareFunction<Response>;
};

export function composeClients(handles: ClientsHandles): ClientsComposition {
  const clients = composeClientsFeature(handles);
  const clientProfile = composeClientProfileFeature({
    ...handles,
    clientIdentities: clients.handles.clientIdentities,
    clientReach: clients.handles.clientReach,
  });
  const clientOnboarding = composeClientOnboardingFeature({
    ...handles,
    attachProgressPhotos: clientProfile.handles.attachProgressPhotos,
    clientIdentities: clients.handles.clientIdentities,
    clientSettings: clientProfile.handles.clientSettings,
    measurementIds: clientProfile.handles.measurementIds,
    measurements: clientProfile.handles.measurements,
    onboardingClients: clients.handles.onboardingClients,
    onboardingReviewStamps: clients.handles.onboardingReviewStamps,
    onboardingSubmissionStamps: clients.handles.clientJourneys,
    recordMeasurementEntry: clientProfile.handles.recordMeasurementEntry,
    recordPhotoConsent: clientProfile.handles.recordPhotoConsent,
    reviewStampWriter: clients.handles.reviewStampWriter,
    seedCoaching: clientProfile.handles.seedCoaching,
  });
  const clientResources = composeClientResourcesFeature({
    ...handles,
    clientReach: clients.handles.clientReach,
  });
  const notificationInbox = composeNotificationInbox(handles);
  const checkIns = composeCheckInsFeature({
    ...handles,
    clientIdentities: clients.handles.clientIdentities,
    clientReach: clients.handles.clientReach,
    inbox: notificationInbox.handles.inbox,
  });
  const notifications = composeNotificationsFeature({
    ...handles,
    clientReach: clients.handles.clientReach,
    expirySources: [checkIns.handles.expirySource],
    inbox: notificationInbox.handles.inbox,
  });

  return {
    components: {
      checkIns: checkIns.feature,
      clientOnboarding,
      clientProfile: clientProfile.feature,
      clientResources,
      clients: clients.feature,
      notifications,
    },
    handles: {
      clientIdentities: clients.handles.clientIdentities,
      clientIds: clients.handles.clientIds,
      clientJourneys: clients.handles.clientJourneys,
      clientReach: clients.handles.clientReach,
      coachingEndHandler: checkIns.handles.coachingEndHandler,
      coachingPeriodHandler: checkIns.handles.coachingPeriodHandler,
      invitationAcceptance: clients.handles.invitationAcceptance,
      openClientProfile: clientProfile.handles.openClientProfile,
      paidClientAdmission: clients.handles.paidClientAdmission,
      writeClient: clients.handles.writeClient,
      writeCoachingStanding: clients.handles.writeCoachingStanding,
    },
    middleware: ({ context }, next) => {
      context.set(clientsContext, clients.feature);
      context.set(clientProfileContext, clientProfile.feature);
      context.set(clientOnboardingContext, clientOnboarding);
      context.set(clientResourcesContext, clientResources);
      context.set(notificationsContext, notifications);
      context.set(checkInsContext, checkIns.feature);
      return next();
    },
  };
}
