import type { ProductLifecycleStatus } from "@eli-coach-platform/domain";
import { sql, type SQL } from "drizzle-orm";

export function productAliasLifecycleWithin(
  lifecycles: readonly [ProductLifecycleStatus, ...ProductLifecycleStatus[]],
): SQL {
  return sql`product.lifecycle_status in (${sql.join(
    lifecycles.map((lifecycle) => sql`${lifecycle}`),
    sql`, `,
  )})`;
}
