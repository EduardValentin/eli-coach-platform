import { createE2eDatabasePool } from "./database";
import { removeExerciseVideoFiles } from "./exercise-video-files";
import { runRegistry } from "./run-registry";

const coachAccounts = runRegistry("coach-accounts-");

const RUN_COACHES = `
  select id from app.accounts where auth_subject_id = any($1::text[])
`;

const VIDEOS_OWNED_BY = `
  select video_file_id as "videoId" from app.exercises
  where owner_account_id in (${RUN_COACHES}) and video_file_id is not null
`;

const DELETE_EXERCISES_OWNED_BY = `
  delete from app.exercises
  where owner_account_id in (${RUN_COACHES})
`;

export function recordCoachAccount(authSubjectId: string, runId: string): void {
  coachAccounts.record(authSubjectId, runId);
}

export async function cleanUpRunExercises(
  runId: string,
  logPrefix: string,
): Promise<{ allCleaned: boolean }> {
  const authSubjectIds = coachAccounts.read(runId);

  if (authSubjectIds.length === 0) {
    return { allCleaned: true };
  }

  const pool = createE2eDatabasePool();

  try {
    const { rows } = await pool.query<{ videoId: string }>(VIDEOS_OWNED_BY, [
      authSubjectIds,
    ]);
    removeExerciseVideoFiles(
      rows.map(({ videoId }) => videoId),
      logPrefix,
    );
    const { rowCount } = await pool.query(DELETE_EXERCISES_OWNED_BY, [
      authSubjectIds,
    ]);
    console.log(`${logPrefix} Exercises: removed ${rowCount ?? 0}`);
    coachAccounts.remove(runId);

    return { allCleaned: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.log(`${logPrefix} Exercises: failed: ${reason}`);

    return { allCleaned: false };
  } finally {
    await pool.end();
  }
}
