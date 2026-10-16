import { VISITOR } from "./food-library-journey";
import type { AccountSession, PlatformRig } from "./platform-rig";

type Requester = AccountSession | typeof VISITOR;

export type RecipeIngredientFields = {
  foodId: string;
  grams: number;
  method: string;
};

export type RecipeFields = {
  name: string;
  ingredients: RecipeIngredientFields[];
  prepMinutes: number;
  cookMinutes: number;
  instructions: string;
  icon: string | null;
  tagIds: string[];
};

export type RecipeRow = RecipeFields & {
  id: string;
  ownerSubjectId: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const RECIPES_API = "/api/coach/recipes";

const RECIPE_ROW_SELECTION = `select recipes.id, recipes.name,
  coalesce((select json_agg(json_build_object(
      'foodId', recipe_ingredients.food_id,
      'grams', recipe_ingredients.grams,
      'method', recipe_ingredients.method
    ) order by recipe_ingredients.position)
    from app.recipe_ingredients
    where recipe_ingredients.recipe_id = recipes.id), '[]'::json) as ingredients,
  recipes.prep_minutes as "prepMinutes", recipes.cook_minutes as "cookMinutes",
  recipes.instructions, recipes.icon,
  array(select recipe_tags.tag_id from app.recipe_tags
    join app.nutrition_tags on nutrition_tags.id = recipe_tags.tag_id
    where recipe_tags.recipe_id = recipes.id
    order by nutrition_tags.display_order) as "tagIds",
  recipes.archived_at as "archivedAt",
  recipes.created_at as "createdAt", recipes.updated_at as "updatedAt",
  owners.auth_subject_id as "ownerSubjectId"
  from app.recipes
  join app.accounts owners on owners.id = recipes.owner_account_id`;

export class RecipeLibraryJourney {
  constructor(private readonly rig: PlatformRig) {}

  create(requester: Requester, fields: unknown): Promise<Response> {
    return this.send(requester, RECIPES_API, this.writeOf("POST", fields));
  }

  async createAccepted(
    requester: AccountSession,
    fields: RecipeFields,
  ): Promise<RecipeRow> {
    const response = await this.create(requester, fields);

    if (response.status !== 200) {
      throw new Error(
        `Creating ${fields.name} answered ${response.status}: ${await response.text()}`,
      );
    }

    const [created] = await this.recipeRowsNamed(requester, fields.name.trim());

    if (!created) {
      throw new Error(`${fields.name} was not stored.`);
    }

    return created;
  }

  edit(
    requester: Requester,
    recipeId: string,
    fields: unknown,
  ): Promise<Response> {
    return this.send(
      requester,
      `${RECIPES_API}/${recipeId}`,
      this.writeOf("PUT", fields),
    );
  }

  recipeRows(): Promise<RecipeRow[]> {
    return this.rig.suite.postgres.queryRows<RecipeRow>({
      sql: `${RECIPE_ROW_SELECTION} order by lower(recipes.name), owners.auth_subject_id, recipes.id`,
      values: [],
    });
  }

  private recipeRowsNamed(
    requester: AccountSession,
    name: string,
  ): Promise<RecipeRow[]> {
    return this.rig.suite.postgres.queryRows<RecipeRow>({
      sql: `${RECIPE_ROW_SELECTION} where recipes.name = $1 and owners.auth_subject_id = $2`,
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
