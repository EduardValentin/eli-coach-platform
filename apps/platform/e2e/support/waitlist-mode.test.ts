import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createE2eDatabasePool: vi.fn(),
  end: vi.fn(),
  query: vi.fn(),
}));

vi.mock("./database", () => ({
  createE2eDatabasePool: mocks.createE2eDatabasePool,
}));

import { disableWaitlistMode, restoreWaitlistMode } from "./waitlist-mode";

describe("Playwright waitlist mode control", () => {
  beforeEach(() => {
    mocks.end.mockReset().mockResolvedValue(undefined);
    mocks.query.mockReset().mockResolvedValue({
      rowCount: 1,
      rows: [{ name: "WAITLIST_MODE" }],
    });
    mocks.createE2eDatabasePool.mockReset().mockReturnValue({
      end: mocks.end,
      query: mocks.query,
    });
  });

  it("disables the persisted mode for protected journeys", async () => {
    // arrange
    const expectedMode = false;

    // act
    await disableWaitlistMode();

    // assert
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("update app.feature_flags"),
      [expectedMode, "WAITLIST_MODE"],
    );
    expect(mocks.end).toHaveBeenCalledOnce();
  });

  it("restores the persisted pre-launch mode after protected journeys", async () => {
    // arrange
    const expectedMode = true;

    // act
    await restoreWaitlistMode();

    // assert
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("update app.feature_flags"),
      [expectedMode, "WAITLIST_MODE"],
    );
    expect(mocks.end).toHaveBeenCalledOnce();
  });

  it("fails clearly when migrations have not created the flag", async () => {
    // arrange
    mocks.query.mockResolvedValue({ rowCount: 0, rows: [] });

    // act
    const disable = disableWaitlistMode();

    // assert
    await expect(disable).rejects.toThrow(
      "WAITLIST_MODE is missing from app.feature_flags. Run pnpm db:migrate before the Playwright suite.",
    );
    expect(mocks.end).toHaveBeenCalledOnce();
  });
});
