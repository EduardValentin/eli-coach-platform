import { randomUUID } from "node:crypto";

import type { CoachingSubscriptionIds } from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";

export class RandomCoachingSubscriptionIds implements CoachingSubscriptionIds {
  generate(): string {
    return randomUUID();
  }
}
