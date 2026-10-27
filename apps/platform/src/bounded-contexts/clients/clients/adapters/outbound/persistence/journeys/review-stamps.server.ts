import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import type { ReviewStamps } from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import { eq } from "drizzle-orm";

import { clientsTable } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/schema.server";

export async function writeReviewStamps(
  database: DatabaseClient,
  input: { clientId: string; stamps: ReviewStamps },
): Promise<void> {
  await executorOf(database)
    .update(clientsTable)
    .set({
      reviewOpenedAt: input.stamps.reviewOpenedAt,
      detailsRequestedAt: input.stamps.detailsRequestedAt,
      detailsAnsweredAt: input.stamps.detailsAnsweredAt,
      answersApprovedAt: input.stamps.answersApprovedAt,
    })
    .where(eq(clientsTable.id, input.clientId));
}
