import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import type {
  Client,
  CoachingStanding,
} from "~/bounded-contexts/clients/clients/domain/client";
import { eq } from "drizzle-orm";

import { clientsTable } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/schema.server";

export async function writeClient(
  database: DatabaseClient,
  client: Client,
): Promise<"written" | "call_already_has_client"> {
  const [written] = await executorOf(database)
    .insert(clientsTable)
    .values(client.toSnapshot())
    .onConflictDoNothing({ target: clientsTable.assessmentCallId })
    .returning({ id: clientsTable.id });

  return written ? "written" : "call_already_has_client";
}

export async function writeCoachingStanding(
  database: DatabaseClient,
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

  await executorOf(database)
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
