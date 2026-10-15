import type { APIRequestContext, APIResponse } from "@playwright/test";

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

export type ExerciseAnswer = { status: number; body: unknown };

const EXERCISES_PATH = "/api/coach/exercises";

const SAVED = 200;

export class ExerciseRequests {
  constructor(private readonly request: APIRequestContext) {}

  private async answerOf(response: APIResponse): Promise<ExerciseAnswer> {
    const text = await response.text();

    try {
      return { status: response.status(), body: JSON.parse(text) };
    } catch {
      return { status: response.status(), body: text };
    }
  }

  async create(fields: ExerciseFields): Promise<ExerciseAnswer> {
    return this.answerOf(
      await this.request.post(EXERCISES_PATH, { data: fields }),
    );
  }

  async createAccepted(fields: ExerciseFields): Promise<void> {
    const answer = await this.create(fields);

    if (answer.status !== SAVED) {
      throw new Error(
        `Creating ${fields.name} answered ${answer.status}: ${JSON.stringify(answer.body)}.`,
      );
    }
  }

  async edit(
    exerciseId: string,
    fields: ExerciseFields,
  ): Promise<ExerciseAnswer> {
    return this.answerOf(
      await this.request.put(`${EXERCISES_PATH}/${exerciseId}`, {
        data: fields,
      }),
    );
  }
}
