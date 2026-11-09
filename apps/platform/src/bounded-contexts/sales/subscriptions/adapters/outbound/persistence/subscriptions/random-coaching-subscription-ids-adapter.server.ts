import { randomUUID } from "node:crypto";

import type { CoachingSubscriptionIdsPort } from "~/bounded-contexts/sales/subscriptions/domain/coaching-subscription";

export class RandomCoachingSubscriptionIdsAdapter implements CoachingSubscriptionIdsPort {
  generate(): string {
    return randomUUID();
  }
}
