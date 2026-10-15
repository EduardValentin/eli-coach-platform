import type { AccountSession, PlatformRig } from "./platform-rig";

export const VISITOR = "visitor";

type Requester = AccountSession | typeof VISITOR;

export type FoodFields = {
  name: string;
  category: string;
  icon: string;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  defaultPortionGrams: number;
  tagIds: string[];
};

export type FoodRow = FoodFields & {
  id: string;
  ownerSubjectId: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type TagRow = { id: string; family: string; label: string };

const FOODS_API = "/api/coach/foods";

export const LIBRARY_PAGE = "/coach/nutrition";

const FOOD_ROW_SELECTION = `select foods.id, foods.name, foods.category, foods.icon,
  foods.kcal::float8 as kcal, foods.protein::float8 as protein,
  foods.carb::float8 as carb, foods.fat::float8 as fat,
  foods.default_portion_grams as "defaultPortionGrams",
  array(select food_tags.tag_id from app.food_tags
    join app.nutrition_tags on nutrition_tags.id = food_tags.tag_id
    where food_tags.food_id = foods.id
    order by nutrition_tags.display_order) as "tagIds",
  foods.archived_at as "archivedAt",
  foods.created_at as "createdAt", foods.updated_at as "updatedAt",
  owners.auth_subject_id as "ownerSubjectId"
  from app.foods
  join app.accounts owners on owners.id = foods.owner_account_id`;

export class FoodLibraryJourney {
  constructor(private readonly rig: PlatformRig) {}

  create(requester: Requester, fields: unknown): Promise<Response> {
    return this.send(requester, FOODS_API, this.writeOf("POST", fields));
  }

  async createAccepted(
    requester: AccountSession,
    fields: FoodFields,
  ): Promise<FoodRow> {
    const response = await this.create(requester, fields);

    if (response.status !== 200) {
      throw new Error(
        `Creating ${fields.name} answered ${response.status}: ${await response.text()}`,
      );
    }

    const [created] = await this.foodRowsNamed(requester, fields.name.trim());

    if (!created) {
      throw new Error(`${fields.name} was not stored.`);
    }

    return created;
  }

  edit(
    requester: Requester,
    foodId: string,
    fields: unknown,
  ): Promise<Response> {
    return this.send(
      requester,
      `${FOODS_API}/${foodId}`,
      this.writeOf("PUT", fields),
    );
  }

  openLibrary(requester: Requester): Promise<Response> {
    return this.send(requester, LIBRARY_PAGE);
  }

  openNewFood(requester: Requester): Promise<Response> {
    return this.send(requester, `${LIBRARY_PAGE}/foods/new`);
  }

  openFood(requester: Requester, foodId: string): Promise<Response> {
    return this.send(requester, `${LIBRARY_PAGE}/foods/${foodId}`);
  }

  foodRows(): Promise<FoodRow[]> {
    return this.rig.suite.postgres.queryRows<FoodRow>({
      sql: `${FOOD_ROW_SELECTION} order by lower(foods.name), owners.auth_subject_id, foods.id`,
      values: [],
    });
  }

  tagRows(): Promise<TagRow[]> {
    return this.rig.suite.postgres.queryRows<TagRow>({
      sql: "select id, family, label from app.nutrition_tags order by display_order",
      values: [],
    });
  }

  private foodRowsNamed(
    requester: AccountSession,
    name: string,
  ): Promise<FoodRow[]> {
    return this.rig.suite.postgres.queryRows<FoodRow>({
      sql: `${FOOD_ROW_SELECTION} where foods.name = $1 and owners.auth_subject_id = $2`,
      values: [name, requester.subjectId],
    });
  }

  private writeOf(method: "POST" | "PUT", fields: unknown): RequestInit {
    return {
      body: typeof fields === "string" ? fields : JSON.stringify(fields),
      headers: { "Content-Type": "application/json" },
      method,
    };
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
