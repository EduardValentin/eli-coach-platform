import { createReadStream, readFileSync } from "node:fs";

import type { APIRequestContext } from "@playwright/test";

import { answerOf, type ApiAnswer } from "./api-answers";
import type { SampleVideo } from "./exercise-video-files";

export type ExerciseFields = {
  name: string;
  type: string;
  unit: string;
  perSide: boolean;
  primaryMuscles: readonly string[];
  secondaryMuscles: readonly string[];
  equipment: readonly string[];
  difficulty: string;
  tags: readonly string[];
  cues: string;
};

export type ServedVideo = {
  status: number;
  headers: Record<string, string>;
  byteCount: number;
};

const EXERCISES_PATH = "/api/coach/exercises";

const MULTIPART_BOUNDARY = "exercise-video-boundary";

const SAVED = 200;

export class ExerciseRequests {
  constructor(private readonly request: APIRequestContext) {}

  private videoPartsOf(fields: ExerciseFields, video: SampleVideo) {
    return {
      exercise: JSON.stringify({ ...fields, video: "attach" }),
      video: createReadStream(video.path),
    };
  }

  private handBuiltBodyOf(fields: ExerciseFields, video: SampleVideo): Buffer {
    const exercise = JSON.stringify({ ...fields, video: "attach" });

    return Buffer.concat([
      Buffer.from(
        `--${MULTIPART_BOUNDARY}\r\nContent-Disposition: form-data; name="exercise"\r\n\r\n${exercise}\r\n` +
          `--${MULTIPART_BOUNDARY}\r\nContent-Disposition: form-data; name="video"; filename="${video.name}"\r\nContent-Type: video/mp4\r\n\r\n`,
      ),
      readFileSync(video.path),
      Buffer.from(`\r\n--${MULTIPART_BOUNDARY}--\r\n`),
    ]);
  }

  async create(fields: ExerciseFields): Promise<ApiAnswer> {
    return answerOf(await this.request.post(EXERCISES_PATH, { data: fields }));
  }

  async createAccepted(fields: ExerciseFields): Promise<void> {
    const answer = await this.create(fields);

    if (answer.status !== SAVED) {
      throw new Error(
        `Creating ${fields.name} answered ${answer.status}: ${JSON.stringify(answer.body)}.`,
      );
    }
  }

  async createWithVideo(
    fields: ExerciseFields,
    video: SampleVideo,
  ): Promise<ApiAnswer> {
    return answerOf(
      await this.request.post(EXERCISES_PATH, {
        multipart: this.videoPartsOf(fields, video),
      }),
    );
  }

  async createWithVideoUnder(
    mediaType: string,
    { fields, video }: { fields: ExerciseFields; video: SampleVideo },
  ): Promise<ApiAnswer> {
    return answerOf(
      await this.request.post(EXERCISES_PATH, {
        data: this.handBuiltBodyOf(fields, video),
        headers: {
          "Content-Type": `${mediaType}; boundary=${MULTIPART_BOUNDARY}`,
        },
      }),
    );
  }

  async edit(exerciseId: string, fields: ExerciseFields): Promise<ApiAnswer> {
    return answerOf(
      await this.request.put(`${EXERCISES_PATH}/${exerciseId}`, {
        data: fields,
      }),
    );
  }

  async editWithVideo(
    exerciseId: string,
    { fields, video }: { fields: ExerciseFields; video: SampleVideo },
  ): Promise<ApiAnswer> {
    return answerOf(
      await this.request.put(`${EXERCISES_PATH}/${exerciseId}`, {
        multipart: this.videoPartsOf(fields, video),
      }),
    );
  }

  async openVideo(videoPath: string, range?: string): Promise<ServedVideo> {
    const response = await this.request.get(videoPath, {
      headers: range === undefined ? {} : { Range: range },
    });

    return {
      status: response.status(),
      headers: response.headers(),
      byteCount: (await response.body()).byteLength,
    };
  }
}
