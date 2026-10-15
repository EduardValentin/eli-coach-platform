import {
  closeSync,
  existsSync,
  ftruncateSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

import { MAX_EXERCISE_VIDEO_BYTES } from "@eli-coach-platform/domain/exercise";
import {
  LANDSCAPE_SAMPLE_VIDEO_PATH,
  PORTRAIT_SAMPLE_VIDEO_PATH,
} from "@eli-coach-platform/test-support/sample-videos";

import { createE2eDatabasePool } from "./database";
import { platformDirectory } from "./repo-paths";

export type SampleVideo = { name: string; path: string };

const RELEASE_RUN_VIDEOS = `
  with run_videos as (
    select id, video_file_id from app.exercises
    where name like '%' || $1 and video_file_id is not null
  )
  update app.exercises
  set video_file_id = null, video_format = null, video_size_bytes = null
  from run_videos
  where app.exercises.id = run_videos.id
  returning run_videos.video_file_id as "videoId"
`;

const MEBIBYTE = 1024 * 1024;

const MULTIPART_ALLOWANCE_BYTES = MEBIBYTE;

const SLOW_UPLOAD_BYTES = 4 * MEBIBYTE;

function exerciseVideoRoot(): string | undefined {
  const videoRoot = process.env.EXERCISE_VIDEO_ROOT;

  return videoRoot && resolve(platformDirectory, videoRoot);
}

function sampleAt(path: string): SampleVideo {
  return { name: basename(path), path };
}

export function storedExerciseVideoIds(): string[] {
  const videoRoot = exerciseVideoRoot();

  if (!videoRoot) {
    throw new Error("EXERCISE_VIDEO_ROOT is not set for the e2e run.");
  }

  const videos = resolve(videoRoot, "videos");

  return existsSync(videos) ? readdirSync(videos) : [];
}

export class ExerciseVideoSamples {
  private readonly directory = mkdtempSync(join(tmpdir(), "exercise-videos-"));

  readonly landscape = sampleAt(LANDSCAPE_SAMPLE_VIDEO_PATH);

  readonly portrait = sampleAt(PORTRAIT_SAMPLE_VIDEO_PATH);

  private written(name: string, contents: string | Buffer): SampleVideo {
    const path = join(this.directory, name);
    writeFileSync(path, contents);

    return { name, path };
  }

  private landscapeOf(name: string, byteCount: number): SampleVideo {
    const path = join(this.directory, name);
    const descriptor = openSync(path, "w");

    try {
      writeSync(descriptor, readFileSync(LANDSCAPE_SAMPLE_VIDEO_PATH));
      ftruncateSync(descriptor, byteCount);
    } finally {
      closeSync(descriptor);
    }

    return { name, path };
  }

  notAVideo(): SampleVideo {
    return this.written("squat-notes.txt", "Brace, sit back, drive up.\n");
  }

  textNamedAsVideo(): SampleVideo {
    return this.written("squat-demo.mp4", "Brace, sit back, drive up.\n");
  }

  overTheCap(): SampleVideo {
    return this.landscapeOf("deadlift-demo.mp4", MAX_EXERCISE_VIDEO_BYTES + 1);
  }

  overTheRequestCap(): SampleVideo {
    return this.landscapeOf(
      "deadlift-long-demo.mp4",
      MAX_EXERCISE_VIDEO_BYTES + MULTIPART_ALLOWANCE_BYTES + 1,
    );
  }

  slowToUpload(): SampleVideo {
    return this.landscapeOf("hip-thrust-demo.mp4", SLOW_UPLOAD_BYTES);
  }

  dispose(): void {
    rmSync(this.directory, { force: true, recursive: true });
  }
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
    const { rows } = await pool.query<{ videoId: string }>(RELEASE_RUN_VIDEOS, [
      runId,
    ]);

    for (const { videoId } of rows) {
      rmSync(resolve(videoRoot, "videos", videoId), { force: true });
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
