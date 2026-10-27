import type {
  ClientCall,
  ClientCalls,
} from "~/bounded-contexts/clients/clients/domain/client-journey";
import type { ClientCallsFacade } from "~/bounded-contexts/scheduling/public/client-calls";

export class SchedulingClientCalls implements ClientCalls {
  constructor(private readonly calls: ClientCallsFacade) {}

  async callOf(callId: string): Promise<ClientCall | null> {
    const call = await this.calls.callOf(callId);

    if (!call) {
      return null;
    }

    const { visitor } = call;

    return {
      startsAt: new Date(call.startsAt),
      firstName: visitor.firstName,
      lastName: visitor.lastName,
      email: visitor.email,
      dateOfBirth: visitor.dateOfBirth,
      gender: visitor.gender,
      country: visitor.country,
      phone: visitor.phone,
      primaryGoal: visitor.primaryGoal,
      notes: visitor.notes,
    };
  }
}
