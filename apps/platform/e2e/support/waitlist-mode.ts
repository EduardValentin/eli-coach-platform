import { createE2eDatabasePool } from "./database";

const WAITLIST_MODE_FEATURE_FLAG = "WAITLIST_MODE";
const WAITLIST_MODE_BEFORE_RUN_ENV_VAR = "E2E_WAITLIST_MODE_BEFORE_RUN";
const SWITCH_WAITLIST_MODE = `
  update app.feature_flags
  set enabled = $2, updated_at = now()
  from (
    select enabled as previous_enabled
    from app.feature_flags
    where name = $1
  ) as previous
  where name = $1
  returning previous.previous_enabled
`;
const WAITLIST_MODE_ON = [WAITLIST_MODE_FEATURE_FLAG, true] as const;
const WAITLIST_MODE_OFF = [WAITLIST_MODE_FEATURE_FLAG, false] as const;

type WaitlistModeSwitch = typeof WAITLIST_MODE_ON | typeof WAITLIST_MODE_OFF;

export async function disableWaitlistMode(): Promise<void> {
  const enabledBeforeRun = await switchWaitlistModeOff();

  process.env[WAITLIST_MODE_BEFORE_RUN_ENV_VAR] = String(enabledBeforeRun);
}

export async function restoreWaitlistMode(): Promise<void> {
  const enabledBeforeRun = process.env[WAITLIST_MODE_BEFORE_RUN_ENV_VAR];

  if (enabledBeforeRun === undefined) {
    return;
  }

  if (enabledBeforeRun === "true") {
    await switchWaitlistModeOn();
  } else {
    await switchWaitlistModeOff();
  }

  delete process.env[WAITLIST_MODE_BEFORE_RUN_ENV_VAR];
}

function switchWaitlistModeOn(): Promise<boolean> {
  return switchWaitlistMode(WAITLIST_MODE_ON);
}

function switchWaitlistModeOff(): Promise<boolean> {
  return switchWaitlistMode(WAITLIST_MODE_OFF);
}

async function switchWaitlistMode(
  switchValues: WaitlistModeSwitch,
): Promise<boolean> {
  const pool = createE2eDatabasePool();

  try {
    const result = await pool.query<{ previous_enabled: boolean }>(
      SWITCH_WAITLIST_MODE,
      [...switchValues],
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
