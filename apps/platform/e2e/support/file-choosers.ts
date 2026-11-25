import type { FileChooser, Page } from "@playwright/test";

type ChosenFiles = Parameters<FileChooser["setFiles"]>[0];

// One listener for the page's whole life keeps Playwright intercepting file
// choosers. A waitForEvent per chooser switches interception off as it ends,
// and that switch can land after the next chooser's wait has switched it on.
export class FileChoosers {
  private readonly pendingChoices: ((chooser: FileChooser) => void)[] = [];

  constructor(page: Page) {
    page.on("filechooser", (chooser) => this.pendingChoices.shift()?.(chooser));
  }

  async choose(files: ChosenFiles, open: () => Promise<void>): Promise<void> {
    const opened = new Promise<FileChooser>((resolve) =>
      this.pendingChoices.push(resolve),
    );

    await open();
    await (await opened).setFiles(files);
  }
}
