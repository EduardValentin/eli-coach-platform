import type { DatabaseTransaction } from "@eli-coach-platform/db";
import type { ReviewStamps } from "@eli-coach-platform/domain/client-onboarding";
import { eq } from "drizzle-orm";

import { clientsTable } from "~/features/coaching-sales/data/schema.server";

export type ReviewStampWriter = typeof writeReviewStamps;

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
