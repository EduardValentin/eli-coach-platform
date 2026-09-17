import { createE2eDatabasePool } from "./database";

const WAITLIST_MODE_FEATURE_FLAG = "WAITLIST_MODE";

export async function disableWaitlistMode(): Promise<void> {
  await writeWaitlistMode("disabled");
}

export async function restoreWaitlistMode(): Promise<void> {
  await writeWaitlistMode("enabled");
}

async function writeWaitlistMode(mode: "disabled" | "enabled"): Promise<void> {
  const pool = createE2eDatabasePool();

  try {
    const result = await pool.query(
      `
        update app.feature_flags
        set enabled = $1, updated_at = now()
        where name = $2
        returning name
      `,
      [mode === "enabled", WAITLIST_MODE_FEATURE_FLAG],
    );

    if (result.rowCount !== 1) {
      throw new Error(
        "WAITLIST_MODE is missing from app.feature_flags. Run pnpm db:migrate before the Playwright suite.",
      );
    }
  } finally {
    await pool.end();
  }
}
