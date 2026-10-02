import { expect, type Locator, type Page } from "@playwright/test";

export type MeasurementRowReadings = readonly string[];

const HISTORY_CAPTION = "Measurements history, newest first";
const RATIO_COLUMN_INDEX = 6;

export class MeasurementsHistory {
  constructor(private readonly page: Page) {}

  private get table() {
    return this.page.getByRole("table", { name: HISTORY_CAPTION });
  }

  private get bodyRows() {
    return this.table.getByRole("rowgroup").nth(1).getByRole("row");
  }

  private rowOn(date: string): Locator {
    return this.bodyRows.filter({
      has: this.page.getByRole("cell", { name: date, exact: true }),
    });
  }

  viewPhotosAction(date: string): Locator {
    return this.table.getByRole("button", {
      name: `View photos from ${date}`,
      exact: true,
    });
  }

  async expectColumns(columns: readonly string[]): Promise<void> {
    const headers = this.table.getByRole("columnheader");

    for (const [index, column] of columns.entries()) {
      await expect(headers.nth(index)).toHaveText(column);
    }
  }

  async expectCaptionAndColumnHeaders(
    columns: readonly string[],
  ): Promise<void> {
    await expect(this.table.locator("caption")).toHaveText(HISTORY_CAPTION);
    await expect(this.table.locator("thead th")).toHaveText([...columns]);
    await expect(this.table.getByRole("columnheader")).toHaveText([...columns]);
  }

  async expectNoThumbnails(): Promise<void> {
    await expect(this.table).toBeVisible();
    await expect(this.table.getByRole("img")).toHaveCount(0);
    await expect(this.table.locator("img")).toHaveCount(0);
  }

  async expectNoColumn(column: string): Promise<void> {
    await expect(this.table).toBeVisible();
    await expect(
      this.table.getByRole("columnheader", { name: column, exact: true }),
    ).toHaveCount(0);
  }

  async expectRows(rows: readonly MeasurementRowReadings[]): Promise<void> {
    await expect(this.bodyRows).toHaveCount(rows.length);

    for (const [index, readings] of rows.entries()) {
      await this.expectRow(index, readings);
    }
  }

  private async expectRow(
    index: number,
    readings: MeasurementRowReadings,
  ): Promise<void> {
    const cells = this.bodyRows.nth(index).getByRole("cell");

    for (const [column, reading] of readings.entries()) {
      await expect(cells.nth(column)).toHaveText(reading);
    }
  }

  async expectRatio(date: string, ratio: string): Promise<void> {
    await expect(
      this.rowOn(date).getByRole("cell").nth(RATIO_COLUMN_INDEX),
    ).toHaveText(ratio);
  }

  async expectViewPhotos(date: string): Promise<void> {
    await expect(this.viewPhotosAction(date)).toBeVisible();
  }

  async expectNoViewPhotos(date: string): Promise<void> {
    await expect(this.rowOn(date)).toBeVisible();
    await expect(this.viewPhotosAction(date)).toHaveCount(0);
  }
}
