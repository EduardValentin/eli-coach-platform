import { createContext, type RouterContext } from "react-router";

import type { OwnResourcesController } from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/client/own-resources-controller.server";
import type { CoachResourcesController } from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/coach/coach-resources-controller.server";
import type { ClientResourcesController } from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/resources/client-resources-controller.server";

export type ClientResourcesFeature = {
  clientResources: ClientResourcesController;
  coachResources: CoachResourcesController;
  ownResources: OwnResourcesController;
};

export const clientResourcesContext: RouterContext<ClientResourcesFeature> =
  createContext<ClientResourcesFeature>();
