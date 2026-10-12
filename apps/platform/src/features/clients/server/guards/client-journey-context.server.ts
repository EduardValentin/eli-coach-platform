import type { ClientJourneySnapshot } from "@eli-coach-platform/domain/client-journey";
import { createContext, type RouterContext } from "react-router";

export const clientJourneyContext: RouterContext<ClientJourneySnapshot | null> =
  createContext<ClientJourneySnapshot | null>();
