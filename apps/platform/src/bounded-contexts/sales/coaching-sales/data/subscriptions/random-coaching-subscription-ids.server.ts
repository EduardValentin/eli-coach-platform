import { randomUUID } from "node:crypto";

import type { CoachingSubscriptionIds } from "@eli-coach-platform/domain/coaching-subscription";

export class RandomCoachingSubscriptionIds implements CoachingSubscriptionIds {
  generate(): string {
    return randomUUID();
  }
}
