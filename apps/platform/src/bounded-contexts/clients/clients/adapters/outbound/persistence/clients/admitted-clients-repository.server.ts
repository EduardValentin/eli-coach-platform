import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import type {
  AdmittedClients,
  Client,
  ClientAdmission,
  CoachingStanding,
} from "~/bounded-contexts/clients/clients/domain/client";
import { eq } from "drizzle-orm";

import { clientsTable } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/schema.server";

export class PostgresAdmittedClients implements AdmittedClients {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async admit(admission: {
    client: Client;
    standing: CoachingStanding;
  }): Promise<ClientAdmission> {
    const [written] = await this.executor
      .insert(clientsTable)
      .values(admission.client.toSnapshot())
      .onConflictDoNothing({ target: clientsTable.assessmentCallId })
      .returning({ id: clientsTable.id });

    if (!written) {
      return "call_already_has_client";
    }

    await this.recordStanding({
      clientId: admission.client.id,
      standing: admission.standing,
    });

    return "admitted";
  }

  async recordStanding(input: {
    clientId: string;
    standing: CoachingStanding;
  }): Promise<void> {
    const {
      status,
      accessEndsAt,
      refundDue,
      bundleMonths,
      programStartsAt,
      paidThrough,
    } = input.standing.toSnapshot();

    await this.executor
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
}
