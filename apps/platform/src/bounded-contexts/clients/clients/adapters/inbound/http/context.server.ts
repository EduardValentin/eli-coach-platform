import { createContext, type RouterContext } from "react-router";

import type { AcceptInvitationUseCase } from "~/bounded-contexts/clients/clients/domain/client-invitation";
import type { ReadClientPortalStandingUseCase } from "~/bounded-contexts/clients/clients/domain/client-journey";
import type { ClientJourneyController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/client/client-journey-controller.server";
import type { OwnClientIdentityController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/client/own-client-identity-controller.server";
import type { CoachClientIdentityController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/coach/coach-client-identity-controller.server";
import type { CoachClientsController } from "~/bounded-contexts/clients/clients/adapters/inbound/http/coach/coach-clients-controller.server";

export type ClientsFeature = {
  acceptInvitationUseCase: AcceptInvitationUseCase;
  clientJourneyController: ClientJourneyController;
  coachClientIdentityController: CoachClientIdentityController;
  coachClientsController: CoachClientsController;
  ownClientIdentityController: OwnClientIdentityController;
  readClientPortalStandingUseCase: ReadClientPortalStandingUseCase;
};

export const clientsContext: RouterContext<ClientsFeature> =
  createContext<ClientsFeature>();
