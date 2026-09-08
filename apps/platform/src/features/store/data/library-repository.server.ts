import type {
  PublishedStoreProduct,
  StoreLibraryRepository,
} from "@eli-coach-platform/domain";
import { sql, type SQL } from "drizzle-orm";

import type { DatabaseClient } from "@eli-coach-platform/db";

import { loadPublishedProducts } from "./published-product-query.server";

export class PostgresStoreLibraryRepository implements StoreLibraryRepository {
  constructor(private readonly database: DatabaseClient) {}

  async listOwnedProducts(
    accountId: string,
  ): Promise<readonly PublishedStoreProduct[]> {
    return loadPublishedProducts(
      this.database,
      productsOwnedByAccount(accountId),
    );
  }

  async findOwnedProductBySlug(query: {
    accountId: string;
    slug: string;
  }): Promise<PublishedStoreProduct | null> {
    const [product] = await loadPublishedProducts(
      this.database,
      ownedProductWithSlug(query),
    );

    return product ?? null;
  }
}

function productsOwnedByAccount(accountId: string): SQL {
  return sql`
    product.lifecycle_status in ('published', 'archived')
    and exists (
      select 1
      from app.acquisitions acquisition
      join app.store_recipients recipient
        on recipient.id = acquisition.recipient_id
      where recipient.account_id = ${accountId}::uuid
        and acquisition.product_id = product.id
    )
  `;
}

function ownedProductWithSlug(query: {
  accountId: string;
  slug: string;
}): SQL {
  return sql`${productsOwnedByAccount(
    query.accountId,
  )} and product.slug = ${query.slug}`;
}
