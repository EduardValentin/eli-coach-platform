import { createE2eDatabasePool } from "./database";
import { removeExerciseVideoFiles } from "./exercise-video-files";
import { runRegistry } from "./run-registry";

const coachAccounts = runRegistry("coach-accounts-");

const OWNED_BY_RUN_COACHES = `owner_account_id in (
    select id from app.accounts where auth_subject_id = any($1::text[])
  )`;

const RUN_EXERCISE_VIDEOS = `
  select video_file_id as "videoId" from app.exercises
  where ${OWNED_BY_RUN_COACHES} and video_file_id is not null
`;

const LIBRARIES = [
  {
    label: "Recipes",
    statement: `delete from app.recipes where ${OWNED_BY_RUN_COACHES}`,
  },
  {
    label: "Foods",
    statement: `delete from app.foods where ${OWNED_BY_RUN_COACHES}`,
  },
  {
    label: "Exercises",
    statement: `delete from app.exercises where ${OWNED_BY_RUN_COACHES}`,
  },
];

export function recordCoachAccount(authSubjectId: string, runId: string): void {
  coachAccounts.record(authSubjectId, runId);
}

export async function cleanUpRunLibraries(
  runId: string,
  logPrefix: string,
): Promise<{ allCleaned: boolean }> {
  const authSubjectIds = coachAccounts.read(runId);

  if (authSubjectIds.length === 0) {
    return { allCleaned: true };
  }

  const pool = createE2eDatabasePool();

  try {
    const { rows } = await pool.query<{ videoId: string }>(
      RUN_EXERCISE_VIDEOS,
      [authSubjectIds],
    );
    removeExerciseVideoFiles(
      rows.map(({ videoId }) => videoId),
      logPrefix,
    );
    for (const { label, statement } of LIBRARIES) {
      const { rowCount } = await pool.query(statement, [authSubjectIds]);
      console.log(`${logPrefix} ${label}: removed ${rowCount ?? 0}`);
    }
    coachAccounts.remove(runId);

    return { allCleaned: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.log(`${logPrefix} Libraries: failed: ${reason}`);

    return { allCleaned: false };
  } finally {
    await pool.end();
  }
}
