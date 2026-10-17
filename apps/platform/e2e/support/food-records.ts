import type pg from "pg";

const ARCHIVE_FOOD_NAMED = `
  update app.foods set archived_at = now(), updated_at = now()
  where name = $1 and archived_at is null
`;

export class FoodRecords {
  constructor(private readonly pool: pg.Pool) {}

  async archive(name: string): Promise<void> {
    const { rowCount } = await this.pool.query(ARCHIVE_FOOD_NAMED, [name]);

    if (rowCount !== 1) {
      throw new Error(`Archiving ${name} touched ${rowCount ?? 0} foods.`);
    }
  }
}
