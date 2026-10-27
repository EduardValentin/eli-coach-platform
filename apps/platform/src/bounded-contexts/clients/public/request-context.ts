export {
  clientsContext,
  type ClientsFeature,
} from "~/bounded-contexts/clients/clients/adapters/inbound/http/context.server";
export { clientJourneyContext } from "~/bounded-contexts/clients/clients/adapters/inbound/http/client-journey-context.server";
export {
  clientOnboardingContext,
  clientProfileContext,
  type ClientOnboardingFeature,
  type ClientProfileFeature,
} from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/context.server";
export {
  clientResourcesContext,
  type ClientResourcesFeature,
} from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/context.server";
export {
  notificationsContext,
  type NotificationsFeature,
} from "~/bounded-contexts/clients/notifications/adapters/inbound/http/context.server";
export {
  checkInsContext,
  type CheckInsFeature,
} from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/context.server";
