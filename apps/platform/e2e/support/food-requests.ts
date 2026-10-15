import type { APIRequestContext, APIResponse } from "@playwright/test";

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

export type FoodAnswer = { status: number; body: unknown };

const FOODS_PATH = "/api/coach/foods";

const SAVED = 200;

export class FoodRequests {
  constructor(private readonly request: APIRequestContext) {}

  private async answerOf(response: APIResponse): Promise<FoodAnswer> {
    const text = await response.text();

    try {
      return { status: response.status(), body: JSON.parse(text) };
    } catch {
      return { status: response.status(), body: text };
    }
  }

  async create(fields: FoodFields): Promise<FoodAnswer> {
    return this.answerOf(await this.request.post(FOODS_PATH, { data: fields }));
  }

  async createAccepted(fields: FoodFields): Promise<void> {
    const answer = await this.create(fields);

    if (answer.status !== SAVED) {
      throw new Error(
        `Creating ${fields.name} answered ${answer.status}: ${JSON.stringify(answer.body)}.`,
      );
    }
  }

  async edit(foodId: string, fields: FoodFields): Promise<FoodAnswer> {
    return this.answerOf(
      await this.request.put(`${FOODS_PATH}/${foodId}`, { data: fields }),
    );
  }
}
