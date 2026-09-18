import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createE2eDatabasePool: vi.fn(),
}));

vi.mock("./database", () => ({
  createE2eDatabasePool: mocks.createE2eDatabasePool,
}));

import { disableWaitlistMode, restoreWaitlistMode } from "./waitlist-mode";

function createFeatureFlagTable(flags: Record<string, boolean>) {
  const table = new Map(Object.entries(flags));
  const end = vi.fn().mockResolvedValue(undefined);

  mocks.createE2eDatabasePool.mockImplementation(() => ({
    end,
    query: async (_sql: string, [enabled, name]: [boolean, string]) => {
      const previousEnabled = table.get(name);

      if (previousEnabled === undefined) {
        return { rowCount: 0, rows: [] };
      }

      table.set(name, enabled);

      return {
        rowCount: 1,
        rows: [{ previous_enabled: previousEnabled }],
      };
    },
  }));

  return { end, table };
}

describe("Playwright waitlist mode control", () => {
  beforeEach(() => {
    mocks.createE2eDatabasePool.mockReset();
  });

  afterEach(() => {
    delete process.env.E2E_WAITLIST_MODE_BEFORE_RUN;
  });

  it("disables the persisted mode for protected journeys", async () => {
    // arrange
    const database = createFeatureFlagTable({ WAITLIST_MODE: true });

    // act
    await disableWaitlistMode();

    // assert
    expect(database.table.get("WAITLIST_MODE")).toBe(false);
    expect(database.end).toHaveBeenCalledOnce();
  });

  it.each([true, false])(
    "restores the persisted mode captured before protected journeys when it was %s",
    async (enabledBeforeRun) => {
      // arrange
      const database = createFeatureFlagTable({
        WAITLIST_MODE: enabledBeforeRun,
      });
      await disableWaitlistMode();

      // act
      await restoreWaitlistMode();

      // assert
      expect(database.table.get("WAITLIST_MODE")).toBe(enabledBeforeRun);
    },
  );

  it("leaves the persisted mode untouched when setup never captured it", async () => {
    // arrange
    const database = createFeatureFlagTable({ WAITLIST_MODE: false });

    // act
    await restoreWaitlistMode();

    // assert
    expect(database.table.get("WAITLIST_MODE")).toBe(false);
    expect(mocks.createE2eDatabasePool).not.toHaveBeenCalled();
  });

  it("fails clearly when migrations have not created the flag", async () => {
    // arrange
    const database = createFeatureFlagTable({});

    // act
    const disable = disableWaitlistMode();

    // assert
    await expect(disable).rejects.toThrow(
      "WAITLIST_MODE is missing from app.feature_flags. Run pnpm db:migrate before the Playwright suite.",
    );
    expect(database.end).toHaveBeenCalledOnce();
  });
});
