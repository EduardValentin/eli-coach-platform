import type { DatabaseTransaction } from "~/shared/database";
import type { ReviewStamps } from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import { eq } from "drizzle-orm";

import { clientsTable } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/schema.server";

export async function writeReviewStamps(
  transaction: DatabaseTransaction,
  input: { clientId: string; stamps: ReviewStamps },
): Promise<void> {
  await transaction
    .update(clientsTable)
    .set({
      reviewOpenedAt: input.stamps.reviewOpenedAt,
      detailsRequestedAt: input.stamps.detailsRequestedAt,
      detailsAnsweredAt: input.stamps.detailsAnsweredAt,
      answersApprovedAt: input.stamps.answersApprovedAt,
    })
    .where(eq(clientsTable.id, input.clientId));
}
