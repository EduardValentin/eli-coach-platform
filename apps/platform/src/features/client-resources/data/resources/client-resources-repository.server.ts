import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  ClientResource,
  type ClientResources,
} from "@eli-coach-platform/domain/client-resources";
import { and, count, desc, eq, isNull } from "drizzle-orm";

import { clientResourcesTable } from "~/features/client-resources/data/schema.server";

type ClientResourceRow = typeof clientResourcesTable.$inferSelect;

export class PostgresClientResources implements ClientResources {
  constructor(private readonly database: DatabaseClient) {}

  async add(resource: ClientResource): Promise<void> {
    const { file, ...columns } = resource.toSnapshot();

    await this.database.insert(clientResourcesTable).values({
      ...columns,
      originalName: file.originalName,
      format: file.format,
      sizeBytes: file.sizeBytes,
      pageCount: file.pageCount,
    });
  }

  async listForClient(clientId: string): Promise<ClientResource[]> {
    const rows = await this.database
      .select()
      .from(clientResourcesTable)
      .where(eq(clientResourcesTable.clientId, clientId))
      .orderBy(
        desc(clientResourcesTable.addedAt),
        desc(clientResourcesTable.id),
      );

    return rows.map(clientResourceOf);
  }

  async findById(resourceId: string): Promise<ClientResource | null> {
    const [row] = await this.database
      .select()
      .from(clientResourcesTable)
      .where(eq(clientResourcesTable.id, resourceId))
      .limit(1);

    return row ? clientResourceOf(row) : null;
  }

  async recordOpened(resource: ClientResource): Promise<void> {
    const { id, openedAt } = resource.toSnapshot();

    await this.database
      .update(clientResourcesTable)
      .set({ openedAt })
      .where(
        and(
          eq(clientResourcesTable.id, id),
          isNull(clientResourcesTable.openedAt),
        ),
      );
  }

  async saveDetails(resource: ClientResource): Promise<void> {
    const { id, title, description } = resource.toSnapshot();

    await this.database
      .update(clientResourcesTable)
      .set({ title, description })
      .where(eq(clientResourcesTable.id, id));
  }

  async remove(resourceId: string): Promise<void> {
    await this.database
      .delete(clientResourcesTable)
      .where(eq(clientResourcesTable.id, resourceId));
  }

  async countUnopenedForClient(clientId: string): Promise<number> {
    const [row] = await this.database
      .select({ unopened: count() })
      .from(clientResourcesTable)
      .where(
        and(
          eq(clientResourcesTable.clientId, clientId),
          isNull(clientResourcesTable.openedAt),
        ),
      );

    return row?.unopened ?? 0;
  }
}

function clientResourceOf(row: ClientResourceRow): ClientResource {
  return ClientResource.reconstitute({
    id: row.id,
    clientId: row.clientId,
    title: row.title,
    description: row.description,
    file: {
      originalName: row.originalName,
      format: row.format,
      sizeBytes: row.sizeBytes,
      pageCount: row.pageCount,
    },
    addedAt: row.addedAt,
    openedAt: row.openedAt,
  });
}
