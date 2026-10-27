import { createContext, type RouterContext } from "react-router";

import type { ReadClientPortalStandingUseCase } from "~/bounded-contexts/clients/clients/domain/client-journey";
import type { ClientJourneyController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/client/client-journey-controller.server";
import type { OwnClientIdentityController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/client/own-client-identity-controller.server";
import type { CoachClientIdentityController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/coach/coach-client-identity-controller.server";
import type { CoachClientsController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/coach/coach-clients-controller.server";
import type { InvitationsController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/public/invitations-controller.server";

export type ClientsFeature = {
  clientJourney: ClientJourneyController;
  coachClientIdentity: CoachClientIdentityController;
  coachClients: CoachClientsController;
  invitations: InvitationsController;
  ownClientIdentity: OwnClientIdentityController;
  readClientPortalStanding: ReadClientPortalStandingUseCase;
};

export const clientsContext: RouterContext<ClientsFeature> =
  createContext<ClientsFeature>();
