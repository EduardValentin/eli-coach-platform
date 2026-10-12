import type { DatabaseTransaction } from "@eli-coach-platform/db";
import {
  Client,
  type ClientIntake,
  type CoachingStanding,
} from "@eli-coach-platform/domain/client";
import { eq } from "drizzle-orm";

import { clientsTable } from "~/features/clients/data/schema.server";

export async function writeClient(
  transaction: DatabaseTransaction,
  admission: { intake: ClientIntake; admittedAt: Date },
): Promise<{ clientId: string } | "call_already_has_client"> {
  const client = Client.fromIntake(admission.intake, admission.admittedAt);
  const [written] = await transaction
    .insert(clientsTable)
    .values(client.toSnapshot())
    .onConflictDoNothing({ target: clientsTable.assessmentCallId })
    .returning({ id: clientsTable.id });

  return written ? { clientId: written.id } : "call_already_has_client";
}

export async function writeCoachingStanding(
  transaction: DatabaseTransaction,
  input: { clientId: string; standing: CoachingStanding },
): Promise<void> {
  const { status, accessEndsAt, refundDue, bundleMonths } =
    input.standing.toSnapshot();

  await transaction
    .update(clientsTable)
    .set({
      coachingStatus: status,
      coachingAccessEndsAt: accessEndsAt,
      coachingRefundDue: refundDue,
      coachingBundleMonths: bundleMonths,
    })
    .where(eq(clientsTable.id, input.clientId));
}
