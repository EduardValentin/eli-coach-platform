import type { StoreRecipientOwnershipRepository } from "@eli-coach-platform/domain";
import { sql } from "drizzle-orm";

import type { DatabaseClient } from "@eli-coach-platform/db";

type IdRow = {
  id: number;
};

export class PostgresStoreRecipientOwnershipRepository
  implements StoreRecipientOwnershipRepository
{
  constructor(private readonly database: DatabaseClient) {}

  async claimUnclaimedRecipients(command: {
    accountId: string;
    deliveryLimitKeys: readonly string[];
  }): Promise<number> {
    // `updated_at` tracks acquisition activity for the address; a claim is not
    // activity. The keys need `sql.param`: a bare array interpolated into a
    // `sql` template expands into SQL chunks rather than one bound value.
    const result = await this.database.execute<IdRow>(sql`
      update app.store_recipients
      set account_id = ${command.accountId}
      where account_id is null
        and delivery_limit_key = any(
          ${sql.param([...command.deliveryLimitKeys])}::text[]
        )
      returning id
    `);

    return result.rows.length;
  }
}
