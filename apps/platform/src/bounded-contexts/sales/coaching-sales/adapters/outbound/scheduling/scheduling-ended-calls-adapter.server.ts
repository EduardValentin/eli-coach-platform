import type {
  EndedCallsPort,
  SalesCall,
} from "~/bounded-contexts/sales/coaching-sales/domain/payment-link";
import type { EndedCallsFacade } from "~/bounded-contexts/scheduling/public/ended-calls-facade";

export class SchedulingEndedCallsAdapter implements EndedCallsPort {
  constructor(private readonly endedCallsFacade: EndedCallsFacade) {}

  async findById(callId: string): Promise<SalesCall | null> {
    const call = await this.endedCallsFacade.callOf(callId);

    if (!call) {
      return null;
    }

    const { visitor } = call;

    return {
      id: call.id,
      firstName: visitor.firstName,
      lastName: visitor.lastName,
      visitorEmail: visitor.email,
      dateOfBirth: visitor.dateOfBirth,
      gender: visitor.gender,
      primaryGoal: visitor.primaryGoal,
      country: visitor.country,
      phone: visitor.phone,
      visitorTimeZone: visitor.timeZone,
      endsAt: new Date(call.endsAt),
    };
  }
}
