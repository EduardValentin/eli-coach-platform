import { createE2eDatabasePool } from "./database";

const WAITLIST_MODE_FEATURE_FLAG = "WAITLIST_MODE";
const WAITLIST_MODE_BEFORE_RUN_ENV_VAR = "E2E_WAITLIST_MODE_BEFORE_RUN";

export async function disableWaitlistMode(): Promise<void> {
  const enabledBeforeRun = await replaceWaitlistMode(false);

  process.env[WAITLIST_MODE_BEFORE_RUN_ENV_VAR] = String(enabledBeforeRun);
}

export async function restoreWaitlistMode(): Promise<void> {
  const enabledBeforeRun = process.env[WAITLIST_MODE_BEFORE_RUN_ENV_VAR];

  if (enabledBeforeRun === undefined) {
    return;
  }

  await replaceWaitlistMode(enabledBeforeRun === "true");
  delete process.env[WAITLIST_MODE_BEFORE_RUN_ENV_VAR];
}

async function replaceWaitlistMode(enabled: boolean): Promise<boolean> {
  const pool = createE2eDatabasePool();

  try {
    const result = await pool.query<{ previous_enabled: boolean }>(
      `
        update app.feature_flags
        set enabled = $1, updated_at = now()
        from (
          select enabled as previous_enabled
          from app.feature_flags
          where name = $2
        ) as previous
        where name = $2
        returning previous.previous_enabled
      `,
      [enabled, WAITLIST_MODE_FEATURE_FLAG],
    );
    const [row] = result.rows;

    if (result.rowCount !== 1 || row === undefined) {
      throw new Error(
        "WAITLIST_MODE is missing from app.feature_flags. Run pnpm db:migrate before the Playwright suite.",
      );
    }

    return row.previous_enabled;
  } finally {
    await pool.end();
  }
}
