import type {
  DatabaseClient,
  DatabaseTransaction,
} from "@eli-coach-platform/db";
import {
  ClientResource,
  type BrowsedResources,
  type ClientResources,
  type ResourceBrowseSnapshot,
  type ResourceTagSnapshot,
  type TagOption,
} from "@eli-coach-platform/domain/client-resources";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  sql,
  type SQL,
} from "drizzle-orm";

import {
  clientResourcesTable,
  clientResourceTagsTable,
} from "~/features/client-resources/data/schema.server";

type ClientResourceRow = typeof clientResourcesTable.$inferSelect;

const TAG_SELECTION = {
  tag: clientResourceTagsTable.tag,
  folded: clientResourceTagsTable.folded,
};

const LIKE_WILDCARDS = /[\\%_]/g;

export class PostgresClientResources implements ClientResources {
  constructor(private readonly database: DatabaseClient) {}

  add(resource: ClientResource): Promise<void> {
    const { file, tags, ...columns } = resource.toSnapshot();

    return this.database.transaction(async (transaction) => {
      await transaction.insert(clientResourcesTable).values({
        ...columns,
        originalName: file.originalName,
        format: file.format,
        sizeBytes: file.sizeBytes,
        pageCount: file.pageCount,
      });
      await this.insertTags(transaction, { resourceId: columns.id, tags });
    });
  }

  async browseForClient(
    clientId: string,
    browse: ResourceBrowseSnapshot,
  ): Promise<BrowsedResources> {
    const ofClient = eq(clientResourcesTable.clientId, clientId);
    const titled = this.titleMatching(browse.search);
    const [rows, tagOptions, { searched, total }] = await Promise.all([
      this.database
        .select()
        .from(clientResourcesTable)
        .where(and(ofClient, titled, this.taggedWith(browse.tag)))
        .orderBy(...this.orderOf(browse)),
      this.tagOptionsOf(ofClient, titled),
      this.searchCountsOf(ofClient, titled),
    ]);

    return {
      resources: await this.withTags(rows),
      tagOptions,
      searched,
      total,
    };
  }

  tagsHeldBy(clientId: string): Promise<ResourceTagSnapshot[]> {
    return this.oldestSpellings(eq(clientResourcesTable.clientId, clientId));
  }

  tagVocabulary(): Promise<ResourceTagSnapshot[]> {
    return this.oldestSpellings();
  }

  async findById(resourceId: string): Promise<ClientResource | null> {
    const rows = await this.database
      .select()
      .from(clientResourcesTable)
      .where(eq(clientResourcesTable.id, resourceId))
      .limit(1);
    const [resource] = await this.withTags(rows);

    return resource ?? null;
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

  saveDetails(resource: ClientResource): Promise<void> {
    const { id, title, description, tags } = resource.toSnapshot();

    return this.database.transaction(async (transaction) => {
      await transaction
        .update(clientResourcesTable)
        .set({ title, description })
        .where(eq(clientResourcesTable.id, id));
      await transaction
        .delete(clientResourceTagsTable)
        .where(eq(clientResourceTagsTable.resourceId, id));
      await this.insertTags(transaction, { resourceId: id, tags });
    });
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

  private async insertTags(
    transaction: DatabaseTransaction,
    held: { resourceId: string; tags: readonly ResourceTagSnapshot[] },
  ): Promise<void> {
    if (held.tags.length === 0) {
      return;
    }

    await transaction.insert(clientResourceTagsTable).values(
      held.tags.map(({ tag, folded }, position) => ({
        resourceId: held.resourceId,
        tag,
        folded,
        position,
      })),
    );
  }

  private titleMatching(search: string): SQL {
    if (search === "") {
      return sql`true`;
    }

    return ilike(
      clientResourcesTable.title,
      `%${search.replace(LIKE_WILDCARDS, "\\$&")}%`,
    );
  }

  private taggedWith(tag: ResourceTagSnapshot | null): SQL | undefined {
    if (!tag) {
      return undefined;
    }

    return sql`exists (select 1 from ${clientResourceTagsTable} where ${clientResourceTagsTable.resourceId} = ${clientResourcesTable.id} and ${clientResourceTagsTable.folded} = ${tag.folded})`;
  }

  private orderOf({ sort, direction }: ResourceBrowseSnapshot): SQL[] {
    const inDirection = direction === "asc" ? asc : desc;

    if (sort === "title") {
      return [
        inDirection(sql`lower(${clientResourcesTable.title})`),
        desc(clientResourcesTable.addedAt),
        desc(clientResourcesTable.id),
      ];
    }

    return [
      inDirection(clientResourcesTable.addedAt),
      inDirection(clientResourcesTable.id),
    ];
  }

  private async tagOptionsOf(ofClient: SQL, titled: SQL): Promise<TagOption[]> {
    const rows = await this.database
      .select({
        tag: sql<string>`(array_agg(${clientResourceTagsTable.tag} order by ${clientResourcesTable.addedAt}, ${clientResourcesTable.id}))[1]`,
        folded: clientResourceTagsTable.folded,
        count: sql<number>`count(*) filter (where ${titled})`.mapWith(Number),
      })
      .from(clientResourceTagsTable)
      .innerJoin(
        clientResourcesTable,
        eq(clientResourcesTable.id, clientResourceTagsTable.resourceId),
      )
      .where(ofClient)
      .groupBy(clientResourceTagsTable.folded)
      .orderBy(asc(clientResourceTagsTable.folded));

    return rows.map(({ tag, folded, count: held }) => ({
      tag: { tag, folded },
      count: held,
    }));
  }

  private async searchCountsOf(
    ofClient: SQL,
    titled: SQL,
  ): Promise<{ searched: number; total: number }> {
    const [counts] = await this.database
      .select({
        searched: sql<number>`count(*) filter (where ${titled})`.mapWith(
          Number,
        ),
        total: count(),
      })
      .from(clientResourcesTable)
      .where(ofClient);

    return { searched: counts?.searched ?? 0, total: counts?.total ?? 0 };
  }

  private async oldestSpellings(holders?: SQL): Promise<ResourceTagSnapshot[]> {
    const rows = await this.database
      .selectDistinctOn([clientResourceTagsTable.folded], TAG_SELECTION)
      .from(clientResourceTagsTable)
      .innerJoin(
        clientResourcesTable,
        eq(clientResourcesTable.id, clientResourceTagsTable.resourceId),
      )
      .where(holders)
      .orderBy(
        asc(clientResourceTagsTable.folded),
        asc(clientResourcesTable.addedAt),
        asc(clientResourcesTable.id),
      );

    return rows.map(({ tag, folded }) => ({ tag, folded }));
  }

  private async withTags(
    rows: readonly ClientResourceRow[],
  ): Promise<ClientResource[]> {
    if (rows.length === 0) {
      return [];
    }

    const tagRows = await this.database
      .select({
        resourceId: clientResourceTagsTable.resourceId,
        ...TAG_SELECTION,
      })
      .from(clientResourceTagsTable)
      .where(
        inArray(
          clientResourceTagsTable.resourceId,
          rows.map(({ id }) => id),
        ),
      )
      .orderBy(
        asc(clientResourceTagsTable.resourceId),
        asc(clientResourceTagsTable.position),
      );

    return rows.map((row) =>
      this.clientResourceOf(
        row,
        tagRows
          .filter(({ resourceId }) => resourceId === row.id)
          .map(({ tag, folded }) => ({ tag, folded })),
      ),
    );
  }

  private clientResourceOf(
    row: ClientResourceRow,
    tags: ResourceTagSnapshot[],
  ): ClientResource {
    return ClientResource.reconstitute({
      id: row.id,
      clientId: row.clientId,
      title: row.title,
      description: row.description,
      tags,
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
}
