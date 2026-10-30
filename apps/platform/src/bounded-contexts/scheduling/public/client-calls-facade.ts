import type { Visitor } from "./visitor";

type ClientCall = {
  id: string;
  startsAt: string;
  coachTimeZone: string;
  visitor: Visitor;
};

export interface ClientCallsFacade {
  callOf(callId: string): Promise<ClientCall | null>;
}
