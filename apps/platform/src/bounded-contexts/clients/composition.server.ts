import type { MiddlewareFunction } from "react-router";

import { clientsContext } from "~/bounded-contexts/clients/clients/adapters/inbound/http/context.server";
import { clientPortalStandingMiddleware } from "~/bounded-contexts/clients/clients/adapters/inbound/http/client-portal-standing.server";
import {
  composeClientsFeature,
  type ClientsFeatureHandles,
} from "~/bounded-contexts/clients/clients/composition.server";
import {
  clientOnboardingContext,
  clientProfileContext,
} from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/context.server";
import {
  composeClientMedia,
  composeClientOnboardingFeature,
  composeClientProfileFeature,
} from "~/bounded-contexts/clients/client-profile/composition.server";
import type { ClientFilesConfig } from "~/bounded-contexts/clients/client-profile/config.server";
import { clientResourcesContext } from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/context.server";
import {
  composeClientResourcesFeature,
  composeResourceFiles,
} from "~/bounded-contexts/clients/client-resources/composition.server";
import { notificationsContext } from "~/bounded-contexts/clients/notifications/adapters/inbound/http/context.server";
import {
  composeNotificationInbox,
  composeNotificationsFeature,
} from "~/bounded-contexts/clients/notifications/composition.server";
import { checkInsContext } from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/context.server";
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

type ConstructedHere =
  | keyof ReturnType<typeof composeClientMedia>
  | keyof ReturnType<typeof composeResourceFiles>;

type ComponentHandles = ClientsFeatureHandles &
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

type ClientsHandles = Omit<ComponentHandles, ConstructedHere> & {
  clientFilesConfig: ClientFilesConfig;
  documentPagesWorkerUrl: URL;
};

export type ClientsComposition = {
  facades: ClientsFacades & ClientProfileFacades & CheckInsFacades;
  middleware: MiddlewareFunction<Response>;
  portalStandingMiddleware: MiddlewareFunction<Response>;
};

export function composeClients(handles: ClientsHandles): ClientsComposition {
  const clients = composeClientsFeature(handles);
  const clientProfile = composeClientProfileFeature({
    ...handles,
    ...clients.handles,
    ...composeClientMedia(handles.clientFilesConfig),
  });
  const clientOnboarding = composeClientOnboardingFeature({
    ...handles,
    ...clients.handles,
    ...clientProfile.handles,
  });
  const clientResources = composeClientResourcesFeature({
    ...handles,
    ...clients.handles,
    ...composeResourceFiles({
      documentPagesWorkerUrl: handles.documentPagesWorkerUrl,
      resourceRoot: handles.clientFilesConfig.CLIENT_RESOURCE_ROOT,
    }),
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
