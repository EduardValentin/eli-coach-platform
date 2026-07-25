import { beforeEach, describe, expect, it, vi } from "vitest";
import { WaitlistMigrationTestContext } from "./waitlist-migration-test-context";

const fileSystemMocks = vi.hoisted(() => ({
  copyFile: vi.fn(),
  mkdir: vi.fn(),
  mkdtemp: vi.fn(),
  readFile: vi.fn(),
  rm: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => fileSystemMocks);

const temporaryFolderPath = "/tmp/eli-coach-waitlist-migrations-test";
const migrationJournal = {
  version: "7",
  dialect: "postgresql",
  entries: [
    {
      idx: 7,
      version: "7",
      when: 1780925910323,
      tag: "0007_violet_darkhawk",
      breakpoints: true,
    },
  ],
};
const migrationJournalWithMultipleEntries = {
  ...migrationJournal,
  entries: [
    {
      idx: 6,
      version: "7",
      when: 1780925910000,
      tag: "0006_copy_in_progress",
      breakpoints: true,
    },
    ...migrationJournal.entries,
  ],
};

describe("WaitlistMigrationTestContext temporary migration folder", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fileSystemMocks.mkdtemp.mockResolvedValue(temporaryFolderPath);
    fileSystemMocks.mkdir.mockResolvedValue(undefined);
    fileSystemMocks.rm.mockResolvedValue(undefined);
    fileSystemMocks.writeFile.mockResolvedValue(undefined);
  });

  it("removes the created folder when the migration journal cannot be parsed", async () => {
    // arrange
    fileSystemMocks.readFile.mockResolvedValue("{invalid-json");
    const context = new WaitlistMigrationTestContext();

    // act
    const result = context.startAtLastPreConsentMigration();

    // assert
    await expect(result).rejects.toBeInstanceOf(SyntaxError);
    expect(fileSystemMocks.rm).toHaveBeenCalledWith(temporaryFolderPath, {
      force: true,
      recursive: true,
    });
  });

  it("removes the created folder when a migration file cannot be copied", async () => {
    // arrange
    const copyError = new Error("migration copy failed");
    fileSystemMocks.readFile.mockResolvedValue(JSON.stringify(migrationJournal));
    fileSystemMocks.copyFile.mockRejectedValue(copyError);
    const context = new WaitlistMigrationTestContext();

    // act
    const result = context.startAtLastPreConsentMigration();

    // assert
    await expect(result).rejects.toBe(copyError);
    expect(fileSystemMocks.rm).toHaveBeenCalledWith(temporaryFolderPath, {
      force: true,
      recursive: true,
    });
  });

  it("waits for every started migration copy before removing the folder", async () => {
    // arrange
    const copyError = new Error("migration copy failed");
    let finishOutstandingCopy: (() => void) | undefined;
    let failCopy: ((error: Error) => void) | undefined;
    const outstandingCopy = new Promise<void>((resolve) => {
      finishOutstandingCopy = resolve;
    });
    const failedCopy = new Promise<void>((_resolve, reject) => {
      failCopy = reject;
    });
    fileSystemMocks.readFile.mockResolvedValue(
      JSON.stringify(migrationJournalWithMultipleEntries),
    );
    fileSystemMocks.copyFile
      .mockReturnValueOnce(outstandingCopy)
      .mockReturnValueOnce(failedCopy);
    const context = new WaitlistMigrationTestContext();

    // act
    const observedResult = context
      .startAtLastPreConsentMigration()
      .catch((error: unknown) => error);
    await vi.waitFor(() => {
      expect(fileSystemMocks.copyFile).toHaveBeenCalledTimes(2);
    });
    failCopy!(copyError);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    const cleanupStartedBeforeOutstandingCopySettled =
      fileSystemMocks.rm.mock.calls.length > 0;
    finishOutstandingCopy!();
    const receivedError = await observedResult;

    // assert
    expect(cleanupStartedBeforeOutstandingCopySettled).toBe(false);
    expect(receivedError).toBe(copyError);
    expect(fileSystemMocks.rm).toHaveBeenCalledWith(temporaryFolderPath, {
      force: true,
      recursive: true,
    });
  });

  it("preserves creation and cleanup failures when removal fails", async () => {
    // arrange
    const cleanupError = new Error("temporary folder removal failed");
    fileSystemMocks.readFile.mockResolvedValue("{invalid-json");
    fileSystemMocks.rm.mockRejectedValue(cleanupError);
    const context = new WaitlistMigrationTestContext();

    // act
    const receivedError = await context
      .startAtLastPreConsentMigration()
      .catch((error: unknown) => error);

    // assert
    expect(receivedError).toBeInstanceOf(AggregateError);
    expect((receivedError as AggregateError).errors).toEqual([
      expect.any(SyntaxError),
      cleanupError,
    ]);
  });
});
