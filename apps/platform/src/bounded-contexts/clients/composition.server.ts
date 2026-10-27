import type { MiddlewareFunction } from "react-router";

import {
  clientsContext,
  type ClientsFeature,
} from "~/bounded-contexts/clients/clients/adapters/inbound/http/context.server";
import { clientPortalStandingMiddleware } from "~/bounded-contexts/clients/clients/adapters/inbound/http/client-portal-standing.server";
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
type ClientsFacades = ReturnType<typeof composeClientsFeature>["facades"];
type ClientProfileComponentHandles = ReturnType<
  typeof composeClientProfileFeature
>["handles"];
type ClientProfileFacades = ReturnType<
  typeof composeClientProfileFeature
>["facades"];
type CheckInsFacades = ReturnType<typeof composeCheckInsFeature>["facades"];

export type ClientsHandles = ClientsFeatureHandles &
  Omit<
    Parameters<typeof composeClientProfileFeature>[0],
    keyof ClientsComponentHandles
  > &
  Omit<
    Parameters<typeof composeClientOnboardingFeature>[0],
    keyof ClientsComponentHandles | keyof ClientProfileComponentHandles
  > &
  Omit<
    Parameters<typeof composeClientResourcesFeature>[0],
    keyof ClientsComponentHandles
  > &
  Omit<
    Parameters<typeof composeNotificationsFeature>[0],
    keyof ClientsComponentHandles | "inbox"
  > &
  Omit<
    Parameters<typeof composeCheckInsFeature>[0],
    keyof ClientsComponentHandles | "inbox"
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
  facades: ClientsFacades & ClientProfileFacades & CheckInsFacades;
  middleware: MiddlewareFunction<Response>;
  portalStandingMiddleware: MiddlewareFunction<Response>;
};

export function composeClients(handles: ClientsHandles): ClientsComposition {
  const clients = composeClientsFeature(handles);
  const clientProfile = composeClientProfileFeature({
    ...handles,
    ...clients.handles,
  });
  const clientOnboarding = composeClientOnboardingFeature({
    ...handles,
    ...clients.handles,
    ...clientProfile.handles,
  });
  const clientResources = composeClientResourcesFeature({
    ...handles,
    ...clients.handles,
  });
  const notificationInbox = composeNotificationInbox(handles);
  const notifications = composeNotificationsFeature({
    ...handles,
    ...clients.handles,
    inbox: notificationInbox.handles.inbox,
  });
  const checkIns = composeCheckInsFeature({
    ...handles,
    ...clients.handles,
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
    facades: {
      ...clients.facades,
      ...clientProfile.facades,
      ...checkIns.facades,
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
    portalStandingMiddleware: clientPortalStandingMiddleware,
  };
}
