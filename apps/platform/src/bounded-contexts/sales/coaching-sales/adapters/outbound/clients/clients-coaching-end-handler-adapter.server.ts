import type { CoachingEndHandlerPort } from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { CoachingPeriodsFacade } from "~/bounded-contexts/clients/public/coaching-periods-facade";

export class ClientsCoachingEndHandlerAdapter implements CoachingEndHandlerPort {
  constructor(private readonly coachingPeriods: CoachingPeriodsFacade) {}

  coachingEnds(notice: { clientId: string; endsAt: Date }): Promise<void> {
    return this.coachingPeriods.endCoaching({
      clientId: notice.clientId,
      endsAt: notice.endsAt.toISOString(),
    });
  }
}
