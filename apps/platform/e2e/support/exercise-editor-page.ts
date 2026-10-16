import { readFileSync } from "node:fs";

import {
  expect,
  type Locator,
  type Page,
  type Request,
} from "@playwright/test";

import type { SampleVideo } from "./exercise-video-files";
import { tabTo } from "./keyboard";
import { escapedPattern, HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type SavedExercise = {
  name: string;
  type: string;
  unit: string;
  sides: "Both sides together" | "One side at a time";
  primaryMuscles: readonly string[];
  secondaryMuscles: readonly string[];
  equipment: readonly string[];
  difficulty: string;
  tags: readonly string[];
  cues: string;
};

export type ExerciseEntries = Partial<Omit<SavedExercise, "tags">> & {
  toggledTags?: readonly string[];
};

export type ProblemField = "Name" | "Primary muscles" | "Form cues";

const NEW_EXERCISE_PATH = "/coach/training/exercises/new";
const VIDEO_PROMPT = "Drop a video here or choose one";
const VIDEO_GUIDANCE =
  "MP4 or MOV up to 50 MB, in a format that plays well on a phone.";
const UPLOAD_FAILED =
  "The upload didn’t go through. Your entries are still here.";
const UPLOAD_PROGRESS = /^Uploading video… (\d{1,3})%$/;
const SAVE_ROUTE = /\/api\/coach\/exercises(\/[^/]+)?$/;
const VIDEO_MEDIA_TYPES: Readonly<Record<string, string>> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  txt: "text/plain",
};
const SLOW_UPLOAD_BYTES_PER_SECOND = 512 * 1024;
const SLOW_UPLOAD_TIMEOUT_MS = 30_000;
const UPLOAD_MESSAGES_KEY = "exerciseVideoUploadMessages";
const PLAYER_CONTROL_STRIP_PX = 16;
const PLAYER_CONTROL_SAMPLES = 8;
const SERVED_VIDEO = /\/api\/exercises\/[^/]+\/video\/[^/]+$/;
const PARTIAL_CONTENT = 206;
const EXERCISE_PATH = /\/coach\/training\/exercises\/([^/]+)$/;
const HELD_KEY_MS = 80;
const PROBLEM_FIELDS: readonly ProblemField[] = [
  "Name",
  "Primary muscles",
  "Form cues",
];
const TAGS = ["Strength", "Hypertrophy", "Recovery"] as const;

export class ExerciseEditorPage {
  constructor(private readonly page: Page) {}

  private get nameField() {
    return this.page.getByRole("textbox", { name: "Name" });
  }

  private get cuesField() {
    return this.page.getByRole("textbox", { name: "Form cues" });
  }

  private get listbox(): Locator {
    return this.page.getByRole("listbox");
  }

  private get choices(): Locator {
    return this.page.getByRole("dialog");
  }

  private choice(name: string): Locator {
    return this.choices.getByRole("checkbox", { name, exact: true });
  }

  private option(name: string): Locator {
    return this.page.getByRole("option", { name: new RegExp(`^${name}\\b`) });
  }

  private sidesOption(name: SavedExercise["sides"]): Locator {
    return this.page.getByRole("radio", { name });
  }

  private heading(name?: string): Locator {
    return this.page.getByRole("heading", { level: 1, name });
  }

  private select(label: string): Locator {
    return this.page.getByRole("combobox", { name: label });
  }

  private multiSelect(label: string): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(`^${label}( \\(required\\))?(, \\d+ selected)?$`),
    });
  }

  private get createButton() {
    return this.page.getByRole("button", { name: "Create exercise" });
  }

  private fieldOf(field: ProblemField): Locator {
    const fields: Record<ProblemField, Locator> = {
      Name: this.nameField,
      "Primary muscles": this.multiSelect(field),
      "Form cues": this.cuesField,
    };

    return fields[field];
  }

  private get videoField() {
    return this.page.getByRole("group", { name: "Demo video" });
  }

  private get videoPreview() {
    return this.videoField.getByLabel("Demo video preview", { exact: true });
  }

  private get videoDropzone() {
    return this.videoField.getByLabel(VIDEO_PROMPT, { exact: true });
  }

  private get replaceVideoButton() {
    return this.videoField.getByRole("button", { name: "Replace video" });
  }

  private get removeVideoButton() {
    return this.videoField.getByRole("button", { name: "Remove video" });
  }

  private get videoUploadStatus() {
    return this.videoField.getByRole("status");
  }

  private get videoUploadFailure() {
    return this.videoField
      .getByRole("alert")
      .filter({ hasText: UPLOAD_FAILED });
  }

  private get videoProblem() {
    return this.videoField
      .getByRole("alert")
      .filter({ hasNotText: UPLOAD_FAILED });
  }

  private get videoControl() {
    return this.videoDropzone.or(this.replaceVideoButton);
  }

  private get savingButton() {
    return this.page.getByRole("button", { name: "Saving…" });
  }

  private isSave(request: Request): boolean {
    return (
      ["POST", "PUT"].includes(request.method()) &&
      SAVE_ROUTE.test(new URL(request.url()).pathname)
    );
  }

  private tag(tag: string): Locator {
    return this.page.getByRole("checkbox", { name: tag, exact: true });
  }

  async open(exerciseId: string): Promise<void> {
    await this.page.goto(`/coach/training/exercises/${exerciseId}`);
  }

  async openNew(): Promise<void> {
    await this.page.goto(NEW_EXERCISE_PATH);
  }

  async exerciseId(): Promise<string> {
    await expect(this.page).toHaveURL(EXERCISE_PATH);
    const id = EXERCISE_PATH.exec(new URL(this.page.url()).pathname)?.[1];

    if (!id || id === "new") {
      throw new Error(`${this.page.url()} is not a saved exercise's editor.`);
    }

    return id;
  }

  async expectNewExercise(): Promise<void> {
    await expect(this.page).toHaveURL(NEW_EXERCISE_PATH);
    await expect(this.heading("New exercise")).toBeVisible();
    await this.expectEntries({
      name: "",
      type: "Resistance",
      unit: "Reps",
      sides: "Both sides together",
      primaryMuscles: [],
      secondaryMuscles: [],
      equipment: [],
      difficulty: "Beginner",
      tags: [],
      cues: "",
    });
    await expect(this.createButton).toBeDisabled();
    await this.expectNoProblems();
  }

  async expectStillNew(): Promise<void> {
    await expect(this.page).toHaveURL(NEW_EXERCISE_PATH);
  }

  async expectEditing(exercise: SavedExercise): Promise<void> {
    await expect(this.heading("Edit exercise")).toBeVisible();
    await this.expectEntries(exercise);
  }

  async enter(entries: ExerciseEntries): Promise<void> {
    await this.waitUntilInteractive();
    if (entries.name !== undefined) await this.nameField.fill(entries.name);
    if (entries.type) await this.choose("Type", entries.type);
    if (entries.unit) await this.choose("Measured in", entries.unit);
    if (entries.sides) await this.sidesOption(entries.sides).check();
    if (entries.primaryMuscles) {
      await this.pick("Primary muscles", entries.primaryMuscles);
    }
    if (entries.secondaryMuscles) {
      await this.pick("Secondary muscles", entries.secondaryMuscles);
    }
    if (entries.equipment) await this.pick("Equipment", entries.equipment);
    if (entries.difficulty) await this.choose("Difficulty", entries.difficulty);
    for (const tag of entries.toggledTags ?? []) await this.tag(tag).click();
    if (entries.cues !== undefined) await this.cuesField.fill(entries.cues);
  }

  async attachVideo(path: string): Promise<void> {
    await this.waitUntilInteractive();
    await this.videoField
      .getByLabel(VIDEO_PROMPT, { exact: true })
      .setInputFiles(path);
  }

  async chooseVideo(sample: SampleVideo): Promise<void> {
    await this.attachVideo(sample.path);
  }

  async dropVideo(sample: SampleVideo): Promise<void> {
    await this.waitUntilInteractive();
    const extension = sample.name.split(".").pop() ?? "";
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
        mimeType: VIDEO_MEDIA_TYPES[extension] ?? "",
        base64: readFileSync(sample.path).toString("base64"),
      },
    );
    const prompt = this.videoField.getByText(VIDEO_PROMPT, { exact: true });

    await prompt.dispatchEvent("dragenter", { dataTransfer });
    await prompt.dispatchEvent("dragover", { dataTransfer });
    await prompt.dispatchEvent("drop", { dataTransfer });
    await dataTransfer.dispose();
  }

  async chooseVideoWithKeyboard(sample: SampleVideo): Promise<void> {
    await this.waitUntilInteractiveByKeyboard();
    await tabTo(this.page, this.videoDropzone);
    await this.expectFocusVisible(this.videoDropzone);
    const chooser = this.page.waitForEvent("filechooser");
    await this.page.keyboard.press("Space");
    await (await chooser).setFiles(sample.path);
  }

  async replaceVideo(sample: SampleVideo): Promise<void> {
    const chooser = this.page.waitForEvent("filechooser");
    await this.replaceVideoButton.click();
    await (await chooser).setFiles(sample.path);
  }

  async replaceVideoWithKeyboard(sample: SampleVideo): Promise<void> {
    await tabTo(this.page, this.replaceVideoButton);
    await this.expectFocusVisible(this.replaceVideoButton);
    const chooser = this.page.waitForEvent("filechooser");
    await this.page.keyboard.press("Enter");
    await (await chooser).setFiles(sample.path);
  }

  async removeVideo(): Promise<void> {
    await this.removeVideoButton.click();
  }

  async removeVideoWithKeyboard(): Promise<void> {
    await tabTo(this.page, this.removeVideoButton);
    await this.expectFocusVisible(this.removeVideoButton);
    await this.page.keyboard.press("Enter");
  }

  async expectFocusOnReplaceVideo(): Promise<void> {
    await expect(this.replaceVideoButton).toBeFocused();
  }

  async expectFocusOnVideoDropzone(): Promise<void> {
    await expect(this.videoDropzone).toBeFocused();
  }

  async playVideoWithKeyboard(): Promise<void> {
    await tabTo(this.page, this.videoPreview);
    await this.page.keyboard.press("Space");
    await expect
      .poll(() =>
        this.videoPreview.evaluate((video: HTMLVideoElement) => !video.paused),
      )
      .toBe(true);
  }

  async expectVideoGuidance(): Promise<void> {
    await expect(this.videoDropzone).toHaveAccessibleDescription(
      VIDEO_GUIDANCE,
    );
    await expect(
      this.videoField.getByText(VIDEO_GUIDANCE, { exact: true }),
    ).toBeVisible();
  }

  async expectNoVideo(): Promise<void> {
    await expect(this.videoDropzone).toBeAttached();
    await expect(this.videoPreview).toHaveCount(0);
    await expect(this.replaceVideoButton).toHaveCount(0);
    await expect(this.removeVideoButton).toHaveCount(0);
  }

  async expectChosenVideoPreview(): Promise<void> {
    await this.expectVideoPreview();
    await expect(this.videoPreview).toHaveAttribute("src", /^blob:/);
    await expect(this.replaceVideoButton).toBeEnabled();
    await expect(this.removeVideoButton).toBeEnabled();
  }

  async expectVideoRefused(message: string): Promise<void> {
    await expect(this.videoProblem).toHaveText(message);
    await expect(this.videoControl).toHaveAttribute("aria-invalid", "true");
    await expect(this.videoControl).toHaveAccessibleDescription(
      new RegExp(escapedPattern(message)),
    );
  }

  async expectNoVideoProblem(): Promise<void> {
    await expect(this.videoProblem).toHaveCount(0);
    await expect(this.videoControl).not.toHaveAttribute("aria-invalid");
  }

  async servedVideoPath(): Promise<string> {
    await this.expectServedVideo();
    const source = await this.videoPreview.getAttribute("src");

    return new URL(source ?? "", this.page.url()).pathname;
  }

  async expectVideoShownWhole(): Promise<void> {
    await expect
      .poll(() =>
        this.videoPreview.evaluate((video: HTMLVideoElement) => {
          const frame = video.getBoundingClientRect();
          const shownWidth =
            (frame.height * video.videoWidth) / video.videoHeight;

          return {
            fit: getComputedStyle(video).objectFit,
            portrait: video.videoHeight > video.videoWidth,
            letterboxed: shownWidth < frame.width,
          };
        }),
      )
      .toEqual({ fit: "contain", portrait: true, letterboxed: true });
  }

  async seekVideoTo(seconds: number): Promise<void> {
    await expect
      .poll(() =>
        this.videoPreview.evaluate(
          (video: HTMLVideoElement) => video.readyState,
        ),
      )
      .toBeGreaterThanOrEqual(1);
    const reached = await this.videoPreview.evaluate(
      (video: HTMLVideoElement, target: number) =>
        new Promise<number>((resolve) => {
          video.addEventListener("seeked", () => resolve(video.currentTime), {
            once: true,
          });
          video.currentTime = target;
        }),
      seconds,
    );

    expect(reached).toBeCloseTo(seconds, 1);
  }

  async expectPlayerControlsUncovered(): Promise<void> {
    await this.videoPreview.scrollIntoViewIfNeeded();
    const covering = await this.videoPreview.evaluate(
      (video: HTMLVideoElement, { strip, samples }) => {
        const frame = video.getBoundingClientRect();
        const y = frame.bottom - strip;

        return Array.from({ length: samples }, (_, index) => {
          const x = frame.left + ((index + 0.5) * frame.width) / samples;
          const found = document.elementFromPoint(x, y);

          return found === video ? null : (found?.outerHTML ?? "nothing");
        }).filter((cover) => cover !== null);
      },
      { strip: PLAYER_CONTROL_STRIP_PX, samples: PLAYER_CONTROL_SAMPLES },
    );

    expect(covering).toEqual([]);
    const [player, remove, replace] = await Promise.all([
      this.videoPreview.boundingBox(),
      this.removeVideoButton.boundingBox(),
      this.replaceVideoButton.boundingBox(),
    ]);

    if (!player || !remove || !replace) {
      throw new Error("The demo video, Remove or Replace is not rendered.");
    }

    expect(remove.y + remove.height).toBeLessThan(player.y + player.height / 2);
    expect(
      replace.x >= player.x + player.width ||
        replace.y >= player.y + player.height,
    ).toBe(true);
  }

  async playVideoFromControls(): Promise<void> {
    await this.videoPreview.scrollIntoViewIfNeeded();
    const player = await this.videoPreview.boundingBox();

    if (!player) throw new Error("The demo video is not rendered.");

    await this.videoPreview.evaluate((video: HTMLVideoElement) => {
      video.muted = true;
    });
    await this.page.mouse.move(
      player.x + player.width / 2,
      player.y + player.height / 2,
    );
    await this.page.mouse.click(
      player.x + PLAYER_CONTROL_STRIP_PX * 1.5,
      player.y + player.height - PLAYER_CONTROL_STRIP_PX * 1.5,
    );
    await expect
      .poll(() =>
        this.videoPreview.evaluate(
          (video: HTMLVideoElement) => video.currentTime,
        ),
      )
      .toBeGreaterThan(0);
  }

  async failNextSave(): Promise<void> {
    await this.page.route(
      (url) => SAVE_ROUTE.test(url.pathname),
      (route) => route.abort("failed"),
      { times: 1 },
    );
  }

  async slowUploadsDown(): Promise<() => Promise<void>> {
    const session = await this.page.context().newCDPSession(this.page);
    await session.send("Network.enable");
    await session.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: SLOW_UPLOAD_BYTES_PER_SECOND,
    });

    return async () => {
      await session.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
      await session.detach();
    };
  }

  countSaves(): () => number {
    let count = 0;
    this.page.on("request", (request) => {
      if (this.isSave(request)) count += 1;
    });

    return () => count;
  }

  async expectUploading(): Promise<void> {
    await expect(this.videoUploadStatus).toHaveText(UPLOAD_PROGRESS);
    await expect(
      this.videoField.getByRole("progressbar", { name: "Video upload" }),
    ).toBeVisible();
    await this.expectLockedWhileSaving();
  }

  async expectUploadAdvancing(): Promise<void> {
    const percentOf = async () =>
      Number(
        UPLOAD_PROGRESS.exec(
          (await this.videoUploadStatus.textContent()) ?? "",
        )?.[1] ?? -1,
      );

    await expect.poll(percentOf).toBeGreaterThan(0);
    const seen = await percentOf();
    await expect.poll(percentOf).toBeGreaterThan(seen);
  }

  async recordUploadMessages(): Promise<void> {
    await this.videoField.locator('[role="status"]').evaluate((region, key) => {
      const messages: string[] = [];
      new MutationObserver(() => {
        const message = region.querySelector("p")?.textContent ?? "";
        if (message && messages.at(-1) !== message) messages.push(message);
      }).observe(region, {
        characterData: true,
        childList: true,
        subtree: true,
      });
      Object.assign(window, { [key]: messages });
    }, UPLOAD_MESSAGES_KEY);
  }

  async expectUploadAnnouncedThenFinishedUp(): Promise<void> {
    const messages = await this.page.evaluate(
      (key) => (window as unknown as Record<string, string[]>)[key] ?? [],
      UPLOAD_MESSAGES_KEY,
    );
    const finishing = messages.indexOf("Finishing up…");
    const percents = messages
      .slice(0, finishing)
      .map((message) => Number(UPLOAD_PROGRESS.exec(message)?.[1] ?? NaN));

    expect(finishing).toBeGreaterThan(1);
    expect(messages.slice(finishing + 1)).toEqual([]);
    expect(percents.every((percent) => percent >= 0 && percent <= 100)).toBe(
      true,
    );
    expect(percents).toEqual([...percents].sort((a, b) => a - b));
    expect(percents.some((percent) => percent > 0 && percent < 100)).toBe(true);
  }

  async waitForUploadToLand(): Promise<void> {
    await expect(this.savingButton).toHaveCount(0, {
      timeout: SLOW_UPLOAD_TIMEOUT_MS,
    });
  }

  async submitAgainWhileSaving(): Promise<void> {
    await this.nameField.press("Enter");
    await this.savingButton.click({ force: true });
  }

  async expectUploadFailed(): Promise<void> {
    await expect(this.videoUploadFailure).toBeVisible();
    await expect(
      this.videoField.getByRole("button", { name: "Try again" }),
    ).toBeEnabled();
    await expect(this.videoUploadStatus).toHaveCount(0);
    await expect(this.savingButton).toHaveCount(0);
    await this.expectChosenVideoPreview();
  }

  async retryUpload(): Promise<void> {
    await this.videoField.getByRole("button", { name: "Try again" }).click();
  }

  private async expectLockedWhileSaving(): Promise<void> {
    await expect(this.savingButton).toBeDisabled();
    await expect(this.replaceVideoButton).toBeDisabled();
    await expect(this.removeVideoButton).toBeDisabled();
  }

  private async expectFocusVisible(control: Locator): Promise<void> {
    await expect
      .poll(() =>
        control.evaluate((element) => element.matches(":focus-visible")),
      )
      .toBe(true);
  }

  async expectVideoPreview(): Promise<void> {
    await expect(this.videoPreview).toBeVisible();
    await expect(this.videoPreview).toHaveAttribute("controls", "");
  }

  async expectServedVideo(): Promise<void> {
    await this.expectVideoPreview();
    await expect(this.videoPreview).toHaveAttribute("src", SERVED_VIDEO);
  }

  async servedVideoStatus(): Promise<number> {
    const served = await this.page.waitForResponse(
      (response) =>
        SERVED_VIDEO.test(new URL(response.url()).pathname) &&
        response.request().headers().range !== undefined,
    );

    return served.status();
  }

  async playVideo(): Promise<void> {
    await this.videoPreview.evaluate((video: HTMLVideoElement) => {
      video.muted = true;

      return video.play();
    });
    await expect
      .poll(() =>
        this.videoPreview.evaluate(
          (video: HTMLVideoElement) => video.currentTime,
        ),
      )
      .toBeGreaterThan(0);
  }

  async create(): Promise<void> {
    await this.createButton.click();
  }

  async expectCreateAvailable(): Promise<void> {
    await expect(this.createButton).toBeEnabled();
  }

  async expectCreateUnavailable(): Promise<void> {
    await expect(this.createButton).toBeDisabled();
  }

  async cancel(): Promise<void> {
    await this.page.getByRole("link", { name: "Cancel" }).click();
  }

  async goBack(): Promise<void> {
    await this.page.getByRole("link", { name: "Back to exercises" }).click();
  }

  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitUntilInteractive();
  }

  async expectWayBackTo(path: string): Promise<void> {
    for (const name of ["Back to exercises", "Cancel"]) {
      await expect(this.page.getByRole("link", { name })).toHaveAttribute(
        "href",
        path,
      );
    }
  }

  async expectOnlyProblem(field: ProblemField, problem: string): Promise<void> {
    await expect(this.page.getByText(problem, { exact: true })).toBeVisible();
    await expect(this.fieldOf(field)).toHaveAttribute("aria-invalid", "true");
    await expect(this.fieldOf(field)).toHaveAccessibleDescription(problem);
    for (const other of PROBLEM_FIELDS.filter((known) => known !== field)) {
      await this.expectNoProblem(other);
    }
    await this.expectCreateUnavailable();
  }

  async expectNoProblems(): Promise<void> {
    for (const field of PROBLEM_FIELDS) await this.expectNoProblem(field);
  }

  async expectFocusOn(field: ProblemField): Promise<void> {
    await expect(this.fieldOf(field)).toBeFocused();
  }

  async expectUnit(unit: string): Promise<void> {
    await expect(this.select("Measured in")).toHaveText(unit);
  }

  async expectUnitChoices(units: readonly string[]): Promise<void> {
    await this.select("Measured in").click();
    await expect(this.listbox.getByRole("option")).toHaveText(
      units.map((unit) => new RegExp(`^${unit}\\b`)),
    );
    await this.page.keyboard.press("Escape");
    await expect(this.listbox).toBeHidden();
  }

  async expectSecondaryChoicesWithout(
    muscles: readonly string[],
  ): Promise<void> {
    await this.multiSelect("Secondary muscles").click();
    await expect(
      this.choices
        .getByRole("list", { name: "Secondary muscles" })
        .getByRole("checkbox")
        .first(),
    ).toBeVisible();
    for (const muscle of muscles) {
      await expect(this.choice(muscle)).toHaveCount(0);
    }
    await this.page.keyboard.press("Escape");
    await expect(this.choices).toBeHidden();
  }

  async createWithKeyboard(exercise: SavedExercise): Promise<void> {
    await this.waitUntilInteractiveByKeyboard();
    await tabTo(this.page, this.nameField);
    await this.page.keyboard.type(exercise.name);
    await this.chooseByKeyboard("Type", exercise.type);
    await this.chooseByKeyboard("Measured in", exercise.unit);
    await tabTo(
      this.page,
      this.page.getByRole("radiogroup", { name: "Sides" }),
    );
    await this.page.keyboard.press(
      exercise.sides === "One side at a time" ? "ArrowRight" : "ArrowLeft",
      { delay: HELD_KEY_MS },
    );
    await expect(this.sidesOption(exercise.sides)).toBeChecked();
    await expect(this.sidesOption(exercise.sides)).toBeFocused();
    await this.pickByKeyboard("Primary muscles", exercise.primaryMuscles);
    await this.pickByKeyboard("Secondary muscles", exercise.secondaryMuscles);
    await this.pickByKeyboard("Equipment", exercise.equipment);
    await this.chooseByKeyboard("Difficulty", exercise.difficulty);
    for (const tag of exercise.tags) {
      await tabTo(this.page, this.tag(tag));
      await this.page.keyboard.press("Space");
    }
    await tabTo(this.page, this.cuesField);
    await this.page.keyboard.type(exercise.cues);
    await this.expectEntries(exercise);
    await tabTo(this.page, this.createButton);
    await this.page.keyboard.press("Enter");
  }

  async saveChanges(): Promise<void> {
    await this.page.getByRole("button", { name: "Save changes" }).click();
  }

  async expectEntries(exercise: SavedExercise): Promise<void> {
    await expect(this.nameField).toHaveValue(exercise.name);
    await expect(this.select("Type")).toHaveText(exercise.type);
    await expect(this.select("Measured in")).toHaveText(exercise.unit);
    await expect(this.sidesOption(exercise.sides)).toBeChecked();
    await this.expectPicked("Primary muscles", exercise.primaryMuscles);
    await this.expectPicked("Secondary muscles", exercise.secondaryMuscles);
    await this.expectPicked("Equipment", exercise.equipment);
    await expect(this.select("Difficulty")).toHaveText(exercise.difficulty);
    for (const tag of TAGS) {
      await expect(this.tag(tag)).toBeChecked({
        checked: exercise.tags.includes(tag),
      });
    }
    await expect(this.cuesField).toHaveValue(exercise.cues);
  }

  private async expectPicked(
    label: string,
    picked: readonly string[],
  ): Promise<void> {
    await expect(this.multiSelect(label)).toHaveAccessibleName(
      new RegExp(
        picked.length === 0
          ? `^${label}( \\(required\\))?$`
          : `^${label}( \\(required\\))?, ${picked.length} selected$`,
      ),
    );
    for (const choice of picked) {
      await expect(
        this.multiSelect(label).getByText(choice, { exact: true }),
      ).toBeVisible();
    }
  }

  private async waitUntilInteractive(): Promise<void> {
    await expect(async () => {
      await this.select("Type").click();
      await expect(this.listbox).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await this.page.keyboard.press("Escape");
    await expect(this.listbox).toBeHidden();
  }

  private async expectNoProblem(field: ProblemField): Promise<void> {
    await expect(this.fieldOf(field)).not.toHaveAttribute("aria-invalid");
    await expect(this.fieldOf(field)).toHaveAccessibleDescription("");
  }

  private async waitUntilInteractiveByKeyboard(): Promise<void> {
    await expect(async () => {
      await this.heading().click({ position: { x: 1, y: 1 } });
      await tabTo(this.page, this.select("Type"));
      await this.page.keyboard.press("Enter");
      await expect(this.listbox).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await this.page.keyboard.press("Escape");
    await expect(this.listbox).toBeHidden();
    await expect(this.select("Type")).toBeFocused();
    await this.page.keyboard.press("Shift+Tab");
  }

  private async chooseByKeyboard(label: string, option: string) {
    await tabTo(this.page, this.select(label));
    await this.page.keyboard.press("Enter");
    await expect(this.listbox).toBeVisible();
    await this.page.keyboard.type(option);
    await expect(this.option(option)).toBeFocused();
    await this.page.keyboard.press("Enter");
    await expect(this.listbox).toBeHidden();
    await expect(this.select(label)).toHaveText(option);
    await expect(this.select(label)).toBeFocused();
  }

  private async pickByKeyboard(label: string, choices: readonly string[]) {
    if (choices.length === 0) return;
    await tabTo(this.page, this.multiSelect(label));
    await this.page.keyboard.press("Enter");
    await expect(this.choices).toBeVisible();
    for (const choice of choices) {
      await tabTo(this.page, this.choice(choice));
      await this.page.keyboard.press("Space");
    }
    await this.page.keyboard.press("Escape");
    await expect(this.choices).toBeHidden();
    await expect(this.multiSelect(label)).toBeFocused();
  }

  private async choose(label: string, option: string): Promise<void> {
    await this.select(label).click();
    await this.option(option).click();
    await expect(this.select(label)).toHaveText(option);
  }

  private async pick(label: string, choices: readonly string[]) {
    await this.multiSelect(label).click();
    for (const choice of choices) await this.choice(choice).click();
    await this.page.keyboard.press("Escape");
    await expect(this.choices).toBeHidden();
  }
}
