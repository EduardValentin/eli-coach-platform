import { createE2eDatabasePool } from "./database";
import { removeExerciseVideoFiles } from "./exercise-video-files";
import { runRegistry } from "./run-registry";

const coachAccounts = runRegistry("coach-accounts-");

const DELETE_EXERCISES_OWNED_BY = `
  delete from app.exercises
  where owner_account_id in (
    select id from app.accounts where auth_subject_id = any($1::text[])
  )
  returning video_file_id as "videoId"
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
    const { rows } = await pool.query<{ videoId: string | null }>(
      DELETE_EXERCISES_OWNED_BY,
      [authSubjectIds],
    );
    const videoIds = rows.flatMap(({ videoId }) => (videoId ? [videoId] : []));
    removeExerciseVideoFiles(videoIds);
    console.log(
      `${logPrefix} Exercises: removed ${rows.length}, with ${videoIds.length} videos`,
    );
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
