export type LibraryItemStatus = 'active' | 'archived';

export const LIBRARY_ITEM_STATUSES: readonly LibraryItemStatus[] = ['active', 'archived'];

export type ArchivableItem = {
  id: string;
  archivedAt?: string;
};

type NamedArchivableItem = ArchivableItem & {
  name: string;
};

const MAX_LIBRARY_NAME_LENGTH = 80;

export type UsageKind = 'program' | 'recipe' | 'meal-plan';

export type LibraryUsage = Readonly<Partial<Record<UsageKind, number>>>;

export type LibraryDeletion = 'deleted' | 'in-use';

export type ExerciseConsumer = {
  exerciseIds: readonly string[];
};

type RecipeWithIngredients = {
  ingredients: readonly { foodId: string }[];
};

type PlannedMealSlot = {
  recipeId?: string;
  clientSelectedRecipeId?: string;
  alternativeRecipeIds: readonly string[];
};

type ClientMealPlan = {
  blocks: readonly { days: readonly { slots: readonly PlannedMealSlot[] }[] }[];
};

const USAGE_ORDER: readonly UsageKind[] = ['program', 'recipe', 'meal-plan'];

const USAGE_NOUNS: Record<UsageKind, { one: string; many: string }> = {
  program: { one: 'program', many: 'programs' },
  recipe: { one: 'recipe', many: 'recipes' },
  'meal-plan': { one: 'meal plan', many: 'meal plans' },
};

export function statusOf(item: ArchivableItem): LibraryItemStatus {
  return item.archivedAt === undefined ? 'active' : 'archived';
}

export function itemsWithStatus<T extends ArchivableItem>(
  items: readonly T[],
  status: LibraryItemStatus,
): T[] {
  return items.filter((item) => statusOf(item) === status);
}

export function countsByStatus(items: readonly ArchivableItem[]): Record<LibraryItemStatus, number> {
  return {
    active: itemsWithStatus(items, 'active').length,
    archived: itemsWithStatus(items, 'archived').length,
  };
}

export function parseStatus(raw: string | null): LibraryItemStatus {
  return raw === 'archived' ? 'archived' : 'active';
}

export function pickableItems<T extends ArchivableItem>(
  items: readonly T[],
  placedIds: readonly (string | undefined)[] = [],
): T[] {
  return items.filter((item) => statusOf(item) === 'active' || placedIds.includes(item.id));
}

export function archivedItem<T extends ArchivableItem>(item: T, at: Date): T {
  return { ...item, archivedAt: at.toISOString() };
}

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

function restoredName(name: string, activeNames: readonly string[]): string {
  const taken = new Set(activeNames.map(nameKey));
  let candidate = name;
  for (let number = 2; taken.has(nameKey(candidate)); number += 1) {
    const suffix = ` (${number})`;
    const base = name.slice(0, MAX_LIBRARY_NAME_LENGTH - suffix.length).trimEnd();
    candidate = `${base}${suffix}`;
  }
  return candidate;
}

export function restoredItem<T extends NamedArchivableItem>(item: T, activeNames: readonly string[]): T {
  const { archivedAt: _archivedAt, ...restored } = item;
  return { ...restored, name: restoredName(item.name, activeNames) } as T;
}

export function restoredItemIn<T extends NamedArchivableItem>(items: readonly T[], id: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`No library item ${id}`);

  const activeNames = itemsWithStatus(items, 'active').map((active) => active.name);
  return restoredItem(item, activeNames);
}

function usedCount(usage: LibraryUsage, kind: UsageKind): number {
  return usage[kind] ?? 0;
}

export function isDeletable(usage: LibraryUsage): boolean {
  return USAGE_ORDER.every((kind) => usedCount(usage, kind) === 0);
}

export function exerciseUsage(exerciseId: string, programs: readonly ExerciseConsumer[]): LibraryUsage {
  return { program: programs.filter((program) => program.exerciseIds.includes(exerciseId)).length };
}

export function foodUsage(foodId: string, recipes: readonly RecipeWithIngredients[]): LibraryUsage {
  return {
    recipe: recipes.filter((recipe) => recipe.ingredients.some((ingredient) => ingredient.foodId === foodId))
      .length,
  };
}

function holdsRecipe(slot: PlannedMealSlot, recipeId: string): boolean {
  return (
    slot.recipeId === recipeId ||
    slot.clientSelectedRecipeId === recipeId ||
    slot.alternativeRecipeIds.includes(recipeId)
  );
}

export function recipeUsage(recipeId: string, mealPlans: readonly ClientMealPlan[]): LibraryUsage {
  return {
    'meal-plan': mealPlans.filter((plan) =>
      plan.blocks.some((block) => block.days.some((day) => day.slots.some((slot) => holdsRecipe(slot, recipeId)))),
    ).length,
  };
}

function countedNoun(kind: UsageKind, count: number): string {
  const noun = USAGE_NOUNS[kind];
  return `${count} ${count === 1 ? noun.one : noun.many}`;
}

export function usageHint(usage: LibraryUsage): string | undefined {
  const places = USAGE_ORDER.filter((kind) => usedCount(usage, kind) > 0).map((kind) =>
    countedNoun(kind, usedCount(usage, kind)),
  );
  if (places.length === 0) return undefined;

  return `Used in ${places.join(' and ')}`;
}
