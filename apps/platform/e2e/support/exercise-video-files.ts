import { rmSync } from "node:fs";
import { resolve } from "node:path";

import { createE2eDatabasePool } from "./database";
import { platformDirectory } from "./repo-paths";

const RELEASE_RUN_VIDEOS = `
  with run_videos as (
    select id, video_file_id from app.exercises
    where name like '%' || $1 and video_file_id is not null
  )
  update app.exercises
  set video_file_id = null, video_format = null, video_size_bytes = null
  from run_videos
  where app.exercises.id = run_videos.id
  returning run_videos.video_file_id as "fileId"
`;

function exerciseVideoRoot(): string | undefined {
  const videoRoot = process.env.EXERCISE_VIDEO_ROOT;

  return videoRoot && resolve(platformDirectory, videoRoot);
}

export async function cleanUpRunExerciseVideos(
  runId: string,
  logPrefix: string,
): Promise<{ allCleaned: boolean }> {
  const videoRoot = exerciseVideoRoot();

  if (!videoRoot) {
    console.log(
      `${logPrefix} Exercise videos: skipped, EXERCISE_VIDEO_ROOT is not set`,
    );

    return { allCleaned: true };
  }

  const pool = createE2eDatabasePool();

  try {
    const { rows } = await pool.query<{ fileId: string }>(RELEASE_RUN_VIDEOS, [
      runId,
    ]);

    for (const { fileId } of rows) {
      rmSync(resolve(videoRoot, "videos", fileId), { force: true });
    }

    console.log(`${logPrefix} Exercise videos: removed ${rows.length}`);

    return { allCleaned: true };
  } catch (error) {
    console.log(
      `${logPrefix} Exercise videos: failed: ${error instanceof Error ? error.message : String(error)}`,
    );

    return { allCleaned: false };
  } finally {
    await pool.end();
  }
}
