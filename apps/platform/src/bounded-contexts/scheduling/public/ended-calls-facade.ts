import type { Visitor } from "./visitor";

type EndedCall = {
  id: string;
  startsAt: string;
  endsAt: string;
  visitor: Visitor;
};

export interface EndedCallsFacade {
  callOf(callId: string): Promise<EndedCall | null>;
}
