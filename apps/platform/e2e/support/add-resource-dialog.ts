import { expect, type Page } from "@playwright/test";

import { tabTo } from "./keyboard";
import { escapedPattern } from "./locator-text";
import type { ResourceDetails } from "./resource-requests";
import type { SampleResource } from "./sample-resources";
import { TagField } from "./tag-field";

export type ResourceRefusalMessage =
  | "Choose a file to add."
  | "That file type can’t be added."
  | "That file is over 25 MB."
  | "That PDF has more than 50 pages."
  | "That PDF can’t be opened. It may be damaged or password protected.";

const DIALOG_NAME = "Add resource";
const DROP_PROMPT = "Drop a file here or choose one";
const BUSY_SUBMIT = /^(Uploading…|Preparing pages…)$/;
const BUSY_PROGRESS = /^(Upload progress|Preparing pages)$/;
const PREPARING_TIMEOUT_MS = 60_000;
const UPLOAD_ROUTE = "**/api/client-resources/clients/*/resources";

export class AddResourceDialog {
  readonly tags: TagField;

  constructor(private readonly page: Page) {
    this.tags = new TagField(page, this.dialog);
  }

  private get dialog() {
    return this.page.getByRole("dialog", { name: DIALOG_NAME });
  }

  private get dropzoneInput() {
    return this.dialog.getByLabel(DROP_PROMPT, { exact: true });
  }

  private get replaceInput() {
    return this.dialog.getByLabel("Replace", { exact: true });
  }

  private get fileInput() {
    return this.dropzoneInput.or(this.replaceInput);
  }

  private get titleField() {
    return this.dialog.getByRole("textbox", { name: "Title", exact: true });
  }

  private get descriptionField() {
    return this.dialog.getByRole("textbox", { name: /^Description/ });
  }

  private get closeButton() {
    return this.dialog.getByRole("button", { name: "Close", exact: true });
  }

  private get submitButton() {
    return this.dialog.getByRole("button", { name: DIALOG_NAME, exact: true });
  }

  private get busySubmitButton() {
    return this.dialog.getByRole("button", { name: BUSY_SUBMIT });
  }

  async choose(sample: SampleResource): Promise<void> {
    await this.dropzoneInput.setInputFiles(sample);
  }

  async drop(sample: SampleResource): Promise<void> {
    const dataTransfer = await this.page.evaluateHandle(
      ({ name, mimeType, base64 }) => {
        const bytes = Uint8Array.from(atob(base64), (character) =>
          character.charCodeAt(0),
        );
        const transfer = new DataTransfer();
        transfer.items.add(new File([bytes], name, { type: mimeType }));

        return transfer;
      },
      {
        name: sample.name,
        mimeType: sample.mimeType,
        base64: sample.buffer.toString("base64"),
      },
    );
    const prompt = this.dialog.getByText(DROP_PROMPT, { exact: true });

    await prompt.dispatchEvent("dragenter", { dataTransfer });
    await prompt.dispatchEvent("dragover", { dataTransfer });
    await prompt.dispatchEvent("drop", { dataTransfer });
    await dataTransfer.dispose();
  }

  async replace(sample: SampleResource): Promise<void> {
    await this.replaceInput.setInputFiles(sample);
  }

  async chooseWithKeyboard(sample: SampleResource): Promise<void> {
    await tabTo(this.page, this.dropzoneInput);
    const chooser = this.page.waitForEvent("filechooser");
    await this.page.keyboard.press("Space");
    await (await chooser).setFiles(sample);
  }

  async expectChosen(fileName: string): Promise<void> {
    await expect(
      this.dialog.getByText(fileName, { exact: true }),
    ).toBeVisible();
    await expect(this.replaceInput).toBeAttached();
    await expect(this.dropzoneInput).toHaveCount(0);
  }

  async fill(details: ResourceDetails): Promise<void> {
    await this.titleField.fill(details.title);
    await this.descriptionField.fill(details.description);
  }

  async describeWithKeyboard(description: string): Promise<void> {
    await tabTo(this.page, this.descriptionField);
    await this.page.keyboard.type(description);
  }

  async clearTitle(): Promise<void> {
    await this.titleField.clear();
  }

  async expectEntries(details: ResourceDetails): Promise<void> {
    await expect(this.titleField).toHaveValue(details.title);
    await expect(this.descriptionField).toHaveValue(details.description);
  }

  async expectTitle(title: string): Promise<void> {
    await expect(this.titleField).toHaveValue(title);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.submitButton).toBeEnabled();
  }

  async submitWithKeyboard(): Promise<void> {
    await tabTo(this.page, this.submitButton);
    await this.page.keyboard.press("Enter");
  }

  async expectRefusal(message: ResourceRefusalMessage): Promise<void> {
    await expect(this.fileInput).toHaveAccessibleDescription(
      new RegExp(escapedPattern(message)),
    );
    await expect(this.dialog.getByText(message, { exact: true })).toBeVisible();
    await expect(this.submitButton).toBeEnabled();
  }

  async expectTitleRequired(): Promise<void> {
    await expect(this.titleField).toHaveAccessibleDescription(
      "Give it a title.",
    );
    await expect(this.titleField).toHaveAttribute("aria-invalid", "true");
  }

  async expectFailed(): Promise<void> {
    await expect(this.dialog.getByRole("alert")).toHaveText(
      "The upload didn’t go through. Try again.",
    );
    await expect(this.submitButton).toBeEnabled();
    await expect(this.closeButton).toBeVisible();
  }

  async expectLockedWhileBusy(): Promise<void> {
    await expect(this.busySubmitButton).toBeDisabled();
    await expect(
      this.dialog.getByRole("progressbar", { name: BUSY_PROGRESS }),
    ).toBeVisible();
    await expect(this.closeButton).toHaveCount(0);
    await expect(
      this.dialog.getByRole("button", { name: "Cancel" }),
    ).toBeDisabled();
    await expect(this.replaceInput).toHaveCount(0);

    await this.page.keyboard.press("Escape");

    await expect(this.dialog).toBeVisible();
    await expect(this.busySubmitButton).toBeDisabled();
  }

  async expectOutsideClickIgnored(): Promise<void> {
    await this.page.mouse.click(5, 5);

    await expect(this.dialog).toBeVisible();
    await expect(this.busySubmitButton).toBeDisabled();
  }

  async holdNextUpload(): Promise<() => void> {
    let release = () => {};
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });

    await this.page.route(
      UPLOAD_ROUTE,
      async (route) => {
        await released;
        await route.continue();
      },
      { times: 1 },
    );

    return release;
  }

  async failNextUpload(): Promise<void> {
    await this.page.route(UPLOAD_ROUTE, (route) => route.abort("failed"), {
      times: 1,
    });
  }

  async expectAdded(): Promise<void> {
    await expect(this.dialog).toBeHidden({ timeout: PREPARING_TIMEOUT_MS });
    await expect(
      this.page.getByText("Resource added.", { exact: true }).last(),
    ).toBeVisible();
  }

  async expectBottomSheet(): Promise<void> {
    const viewport = this.page.viewportSize();

    if (!viewport) throw new Error("The page has no viewport size.");

    await expect
      .poll(async () => {
        const box = await this.dialog.boundingBox();

        return (
          box && {
            width: Math.round(box.width),
            bottom: Math.round(box.y + box.height),
          }
        );
      })
      .toEqual({ width: viewport.width, bottom: viewport.height });
  }
}
