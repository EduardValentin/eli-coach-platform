import type { DatabaseTransaction } from "~/shared/database";
import type {
  Client,
  CoachingStanding,
} from "@eli-coach-platform/domain/client";
import { eq } from "drizzle-orm";

import { clientsTable } from "~/features/clients/data/schema.server";

export async function writeClient(
  transaction: DatabaseTransaction,
  client: Client,
): Promise<"written" | "call_already_has_client"> {
  const [written] = await transaction
    .insert(clientsTable)
    .values(client.toSnapshot())
    .onConflictDoNothing({ target: clientsTable.assessmentCallId })
    .returning({ id: clientsTable.id });

  return written ? "written" : "call_already_has_client";
}

export async function writeCoachingStanding(
  transaction: DatabaseTransaction,
  input: { clientId: string; standing: CoachingStanding },
): Promise<void> {
  const {
    status,
    accessEndsAt,
    refundDue,
    bundleMonths,
    programStartsAt,
    paidThrough,
  } = input.standing.toSnapshot();

  await transaction
    .update(clientsTable)
    .set({
      coachingStatus: status,
      coachingAccessEndsAt: accessEndsAt,
      coachingRefundDue: refundDue,
      coachingBundleMonths: bundleMonths,
      coachingProgramStartsAt: programStartsAt,
      coachingPaidThrough: paidThrough,
    })
    .where(eq(clientsTable.id, input.clientId));
}
