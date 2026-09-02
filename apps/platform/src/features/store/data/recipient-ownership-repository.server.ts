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
    // `updated_at` deliberately stays put: on this table it records the last
    // acquisition activity for the address, and a claim is not activity.
    //
    // `account_id is null` is the whole idempotency story. A second claim for
    // the same account matches nothing, and a claim by a different account
    // never takes a recipient the first one already holds — which is what
    // keeps a deleted account's ownership out of a later account's reach.
    //
    // The keys go through `sql.param`: an array interpolated straight into a
    // `sql` template is expanded into a parenthesised list of SQL chunks, not
    // bound as one array value, which `any(...)` cannot read.
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
