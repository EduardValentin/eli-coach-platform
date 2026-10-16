import type { APIRequestContext } from "@playwright/test";

import { answerOf, type ApiAnswer } from "./api-answers";

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

const EXERCISES_PATH = "/api/coach/exercises";

const SAVED = 200;

export class ExerciseRequests {
  constructor(private readonly request: APIRequestContext) {}

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

  async edit(exerciseId: string, fields: ExerciseFields): Promise<ApiAnswer> {
    return answerOf(
      await this.request.put(`${EXERCISES_PATH}/${exerciseId}`, {
        data: fields,
      }),
    );
  }
}
