import type { APIRequestContext } from "@playwright/test";

import { answerOf, type ApiAnswer } from "./api-answers";

export type FoodFields = {
  name: string;
  category: string;
  icon: string;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  defaultPortionGrams: number;
  tagIds: readonly string[];
};

const FOODS_PATH = "/api/coach/foods";

const SAVED = 200;

export class FoodRequests {
  constructor(private readonly request: APIRequestContext) {}

  async create(fields: FoodFields): Promise<ApiAnswer> {
    return answerOf(await this.request.post(FOODS_PATH, { data: fields }));
  }

  async createAccepted(fields: FoodFields): Promise<void> {
    const answer = await this.create(fields);

    if (answer.status !== SAVED) {
      throw new Error(
        `Creating ${fields.name} answered ${answer.status}: ${JSON.stringify(answer.body)}.`,
      );
    }
  }

  async edit(foodId: string, fields: FoodFields): Promise<ApiAnswer> {
    return answerOf(
      await this.request.put(`${FOODS_PATH}/${foodId}`, { data: fields }),
    );
  }
}
