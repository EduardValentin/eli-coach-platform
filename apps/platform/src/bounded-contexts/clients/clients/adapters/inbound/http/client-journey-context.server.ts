import type { ClientJourneySnapshot } from "~/bounded-contexts/clients/clients/domain/client-journey";
import { createContext, type RouterContext } from "react-router";

export const clientJourneyContext: RouterContext<ClientJourneySnapshot | null> =
  createContext<ClientJourneySnapshot | null>();
