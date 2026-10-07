import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  ClientResource,
  type ClientResources,
} from "@eli-coach-platform/domain/client-resources";
import { desc, eq } from "drizzle-orm";

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
  });
}
