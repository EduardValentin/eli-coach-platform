import { readFile } from "node:fs/promises";

import { expect, type Locator, type Page } from "@playwright/test";

type StoreDownloadedFile = {
  suggestedFilename: string;
  archiveEntryNames: string[];
};

const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_START_OFFSET = 16;
const CENTRAL_DIRECTORY_HEADER_BYTES = 46;
const NAME_LENGTH_OFFSET = 28;
const EXTRA_LENGTH_OFFSET = 30;
const COMMENT_LENGTH_OFFSET = 32;

export class StoreDownloadPage {
  constructor(private readonly page: Page) {}

  private get downloadButton(): Locator {
    return this.page.getByRole("button", { name: "Download your resources" });
  }

  async open(link: string): Promise<void> {
    await this.load(link);
    await expect(
      this.page.getByRole("heading", { level: 1, name: "Your resources" }),
    ).toBeVisible();
  }

  async openUnavailable(link: string): Promise<void> {
    await this.load(link);
    await this.expectUnavailable();
  }

  async downloadRefused(): Promise<void> {
    await this.downloadButton.click();
    await this.expectUnavailable();
  }

  async expectNoMentionOf(text: string): Promise<void> {
    await expect(this.page.getByRole("main")).not.toContainText(text);
  }

  async download(): Promise<StoreDownloadedFile> {
    const downloadEvent = this.page.waitForEvent("download");
    await this.downloadButton.click();
    const download = await downloadEvent;

    return {
      suggestedFilename: download.suggestedFilename(),
      archiveEntryNames: this.archiveEntryNamesOf(
        await readFile(await download.path()),
      ),
    };
  }

  private async expectUnavailable(): Promise<void> {
    await expect(
      this.page.getByRole("heading", {
        level: 1,
        name: "This link is no longer available",
      }),
    ).toBeVisible();
    await expect(this.downloadButton).toHaveCount(0);
  }

  private async load(link: string): Promise<void> {
    await this.page.goto("about:blank");
    await this.page.goto(link);
  }

  private archiveEntryNamesOf(archive: Buffer): string[] {
    const names: string[] = [];
    const end = archive.lastIndexOf(
      this.signatureBytes(END_OF_CENTRAL_DIRECTORY_SIGNATURE),
    );
    let offset =
      end < 0 ? -1 : archive.readUInt32LE(end + CENTRAL_DIRECTORY_START_OFFSET);

    while (
      offset >= 0 &&
      offset + CENTRAL_DIRECTORY_HEADER_BYTES <= archive.length &&
      archive.readUInt32LE(offset) === CENTRAL_DIRECTORY_SIGNATURE
    ) {
      const nameLength = archive.readUInt16LE(offset + NAME_LENGTH_OFFSET);
      const nameStart = offset + CENTRAL_DIRECTORY_HEADER_BYTES;

      names.push(archive.toString("utf8", nameStart, nameStart + nameLength));
      offset =
        nameStart +
        nameLength +
        archive.readUInt16LE(offset + EXTRA_LENGTH_OFFSET) +
        archive.readUInt16LE(offset + COMMENT_LENGTH_OFFSET);
    }

    return names;
  }

  private signatureBytes(value: number): Buffer {
    const signature = Buffer.alloc(4);
    signature.writeUInt32LE(value);

    return signature;
  }
}
