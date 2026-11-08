import { createE2eDatabasePool } from "./database";
import { runRegistry } from "./run-registry";

export const storeProductRegistry = runRegistry("store-products-");

const RETIRE_RUN_PRODUCTS = `
  update app.products
  set lifecycle_status = 'archived', updated_at = now()
  where slug = any($1::text[]) and lifecycle_status <> 'archived'
`;

export function recordStoreProduct(slug: string, runId: string): void {
  storeProductRegistry.record(slug, runId);
}

export async function cleanUpRunStoreProducts(
  runId: string,
  logPrefix: string,
): Promise<{ allCleaned: boolean }> {
  const slugs = storeProductRegistry.read(runId);

  if (slugs.length === 0) {
    return { allCleaned: true };
  }

  const pool = createE2eDatabasePool();

  try {
    const { rowCount } = await pool.query(RETIRE_RUN_PRODUCTS, [slugs]);
    console.log(`${logPrefix} Store products: retired ${rowCount ?? 0}`);
    storeProductRegistry.remove(runId);

    return { allCleaned: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.log(`${logPrefix} Store products: failed: ${reason}`);

    return { allCleaned: false };
  } finally {
    await pool.end();
  }
}
