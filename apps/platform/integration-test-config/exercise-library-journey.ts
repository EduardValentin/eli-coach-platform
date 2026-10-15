import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

import type { AccountSession, PlatformRig } from "./platform-rig";

export const VISITOR = "visitor";

type Requester = AccountSession | typeof VISITOR;

export type ExerciseFields = {
  name: string;
  type: string;
  unit: string;
  perSide: boolean;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  difficulty: string;
  tags: string[];
  cues: string;
};

export type ExerciseRow = Omit<ExerciseFields, "cues"> & {
  id: string;
  formCues: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UploadedVideo = { name: string; type: string; bytes: Uint8Array };

export type ExerciseVideoColumns = {
  videoFileId: string | null;
  videoFormat: string | null;
  videoSizeBytes: number | null;
};

export type ExerciseVideoFiles = { kept: string[]; incoming: string[] };

const EXERCISES_API = "/api/coach/exercises";

export const LIBRARY_PAGE = "/coach/training";

const EXERCISE_ROW_SELECTION = `select id, name, form_cues as "formCues", type, unit, per_side as "perSide", difficulty,
  primary_muscles as "primaryMuscles", secondary_muscles as "secondaryMuscles", equipment, tags,
  created_at as "createdAt", updated_at as "updatedAt"
  from app.exercises`;

export class ExerciseLibraryJourney {
  constructor(private readonly rig: PlatformRig) {}

  create(requester: Requester, fields: unknown): Promise<Response> {
    return this.send(requester, EXERCISES_API, this.writeOf("POST", fields));
  }

  async createAccepted(
    requester: AccountSession,
    fields: ExerciseFields,
  ): Promise<ExerciseRow> {
    const response = await this.create(requester, fields);

    if (response.status !== 200) {
      throw new Error(
        `Creating ${fields.name} answered ${response.status}: ${await response.text()}`,
      );
    }

    const [created] = await this.exerciseRowsNamed(fields.name.trim());

    if (!created) {
      throw new Error(`${fields.name} was not stored.`);
    }

    return created;
  }

  edit(
    requester: Requester,
    exerciseId: string,
    fields: unknown,
  ): Promise<Response> {
    return this.send(
      requester,
      `${EXERCISES_API}/${exerciseId}`,
      this.writeOf("PUT", fields),
    );
  }

  createWithVideo(
    requester: Requester,
    fields: unknown,
    video: UploadedVideo,
  ): Promise<Response> {
    return this.send(
      requester,
      EXERCISES_API,
      this.uploadOf("POST", { fields, video }),
    );
  }

  editWithVideo(
    requester: Requester,
    exerciseId: string,
    upload: { fields: unknown; video: UploadedVideo },
  ): Promise<Response> {
    return this.send(
      requester,
      `${EXERCISES_API}/${exerciseId}`,
      this.uploadOf("PUT", upload),
    );
  }

  playVideo(
    requester: Requester,
    exerciseId: string,
    play: { fileId: string; range?: string },
  ): Promise<Response> {
    return this.send(
      requester,
      `/api/exercises/${exerciseId}/video/${play.fileId}`,
      { headers: play.range ? { Range: play.range } : {} },
    );
  }

  async videoColumnsOf(exerciseId: string): Promise<ExerciseVideoColumns> {
    const [columns] =
      await this.rig.suite.postgres.queryRows<ExerciseVideoColumns>({
        sql: `select video_file_id as "videoFileId", video_format as "videoFormat", video_size_bytes as "videoSizeBytes"
        from app.exercises where id = $1`,
        values: [exerciseId],
      });

    if (!columns) {
      throw new Error(`Exercise ${exerciseId} is not stored.`);
    }

    return columns;
  }

  async videoFiles(): Promise<ExerciseVideoFiles> {
    const root = this.rig.suite.videoRoot();

    return {
      kept: await this.filesIn(join(root, "videos")),
      incoming: await this.filesIn(join(root, ".incoming")),
    };
  }

  async clearVideoFiles(): Promise<void> {
    const root = this.rig.suite.videoRoot();

    await rm(join(root, "videos"), { force: true, recursive: true });
    await rm(join(root, ".incoming"), { force: true, recursive: true });
  }

  keptVideoPath(fileId: string): string {
    return join(this.rig.suite.videoRoot(), "videos", fileId);
  }

  openLibrary(requester: Requester): Promise<Response> {
    return this.send(requester, LIBRARY_PAGE);
  }

  openNewExercise(requester: Requester): Promise<Response> {
    return this.send(requester, `${LIBRARY_PAGE}/exercises/new`);
  }

  openExercise(requester: Requester, exerciseId: string): Promise<Response> {
    return this.send(requester, `${LIBRARY_PAGE}/exercises/${exerciseId}`);
  }

  exerciseRows(): Promise<ExerciseRow[]> {
    return this.rig.suite.postgres.queryRows<ExerciseRow>({
      sql: `${EXERCISE_ROW_SELECTION} order by lower(name), id`,
      values: [],
    });
  }

  private exerciseRowsNamed(name: string): Promise<ExerciseRow[]> {
    return this.rig.suite.postgres.queryRows<ExerciseRow>({
      sql: `${EXERCISE_ROW_SELECTION} where name = $1`,
      values: [name],
    });
  }

  private writeOf(method: "POST" | "PUT", fields: unknown): RequestInit {
    return {
      body: typeof fields === "string" ? fields : JSON.stringify(fields),
      headers: { "Content-Type": "application/json" },
      method,
    };
  }

  private uploadOf(
    method: "POST" | "PUT",
    upload: { fields: unknown; video: UploadedVideo },
  ): RequestInit {
    const form = new FormData();
    form.set("exercise", JSON.stringify(upload.fields));
    form.set(
      "video",
      new File([new Uint8Array(upload.video.bytes)], upload.video.name, {
        type: upload.video.type,
      }),
    );

    return { body: form, method };
  }

  private async filesIn(folder: string): Promise<string[]> {
    try {
      return (await readdir(folder)).sort();
    } catch {
      return [];
    }
  }

  private send(
    requester: Requester,
    target: string,
    init: RequestInit = {},
  ): Promise<Response> {
    if (requester === VISITOR) {
      return this.rig.suite.request(
        new Request(this.rig.suite.url(target), init),
      );
    }

    return this.rig.requestAs(requester, target, init);
  }
}
