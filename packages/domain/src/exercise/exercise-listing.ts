import type { ExerciseSnapshot } from "./exercise";
import {
  DIFFICULTIES,
  EXERCISE_TAGS,
  EXERCISE_TYPES,
  type ExerciseTag,
  type ExerciseType,
} from "./vocabulary";

type ExerciseListingItem = Pick<
  ExerciseSnapshot,
  "name" | "type" | "tags" | "equipment" | "primaryMuscles" | "difficulty"
>;

export type ExerciseTypeFilter = "any" | ExerciseType;
export const EXERCISE_TYPE_FILTERS: readonly ExerciseTypeFilter[] = [
  "any",
  ...EXERCISE_TYPES,
];

export type ExerciseEquipmentFilter = "any" | "none";
export const EXERCISE_EQUIPMENT_FILTERS: readonly ExerciseEquipmentFilter[] = [
  "any",
  "none",
];

type ExerciseSelectionSnapshot = {
  type: ExerciseTypeFilter;
  tags: readonly ExerciseTag[];
  equipment: ExerciseEquipmentFilter;
  query: string;
};

type ExerciseSelectionInput = {
  type: string | null;
  tags: readonly string[];
  equipment: string | null;
  query: string;
};

export class ExerciseSelection {
  private constructor(private readonly fields: ExerciseSelectionSnapshot) {}

  static none(): ExerciseSelection {
    return new ExerciseSelection({
      type: "any",
      tags: [],
      equipment: "any",
      query: "",
    });
  }

  static parse(input: ExerciseSelectionInput): ExerciseSelection {
    return ExerciseSelection.none().parsed(input);
  }

  get type(): ExerciseTypeFilter {
    return this.fields.type;
  }

  get tags(): readonly ExerciseTag[] {
    return this.fields.tags;
  }

  get equipment(): ExerciseEquipmentFilter {
    return this.fields.equipment;
  }

  get query(): string {
    return this.fields.query;
  }

  toSnapshot(): ExerciseSelectionSnapshot {
    return { ...this.fields, tags: [...this.fields.tags] };
  }

  isActive(): boolean {
    return (
      this.fields.type !== "any" ||
      this.fields.tags.length > 0 ||
      this.fields.equipment !== "any" ||
      this.fields.query.trim().length > 0
    );
  }

  matches(item: ExerciseListingItem): boolean {
    return (
      this.matchesSearch(item) &&
      this.matchesType(item) &&
      this.matchesTags(item) &&
      this.matchesEquipment(item)
    );
  }

  countsByType(
    items: readonly ExerciseListingItem[],
  ): Record<ExerciseTypeFilter, number> {
    const withoutType = this.withoutType();
    const others = items.filter((item) => withoutType.matches(item));

    return this.countingEach(
      EXERCISE_TYPE_FILTERS,
      others,
      (item, type) => type === "any" || item.type === type,
    );
  }

  countsByTag(
    items: readonly ExerciseListingItem[],
  ): Record<ExerciseTag, number> {
    const withoutTags = this.withoutTags();
    const others = items.filter((item) => withoutTags.matches(item));

    return this.countingEach(EXERCISE_TAGS, others, (item, tag) =>
      item.tags.includes(tag),
    );
  }

  countsByEquipment(
    items: readonly ExerciseListingItem[],
  ): Record<ExerciseEquipmentFilter, number> {
    const withoutEquipment = this.withoutEquipment();
    const others = items.filter((item) => withoutEquipment.matches(item));

    return this.countingEach(
      EXERCISE_EQUIPMENT_FILTERS,
      others,
      (item, equipment) => equipment === "any" || item.equipment.length === 0,
    );
  }

  withType(type: ExerciseTypeFilter): ExerciseSelection {
    return new ExerciseSelection({ ...this.fields, type });
  }

  withTagToggled(tag: ExerciseTag): ExerciseSelection {
    const tags = this.fields.tags.includes(tag)
      ? this.fields.tags.filter((chosen) => chosen !== tag)
      : [...this.fields.tags, tag];

    return new ExerciseSelection({ ...this.fields, tags });
  }

  withEquipment(equipment: ExerciseEquipmentFilter): ExerciseSelection {
    return new ExerciseSelection({ ...this.fields, equipment });
  }

  withQuery(query: string): ExerciseSelection {
    return new ExerciseSelection({ ...this.fields, query });
  }

  private parsed(input: ExerciseSelectionInput): ExerciseSelection {
    return new ExerciseSelection({
      type: this.knownType(input.type),
      tags: this.knownTags(input.tags),
      equipment: this.knownEquipment(input.equipment),
      query: input.query,
    });
  }

  private knownType(raw: string | null): ExerciseTypeFilter {
    return EXERCISE_TYPE_FILTERS.find((type) => type === raw) ?? "any";
  }

  private knownTags(raw: readonly string[]): ExerciseTag[] {
    return raw.filter((tag): tag is ExerciseTag =>
      EXERCISE_TAGS.some((known) => known === tag),
    );
  }

  private knownEquipment(raw: string | null): ExerciseEquipmentFilter {
    return (
      EXERCISE_EQUIPMENT_FILTERS.find((equipment) => equipment === raw) ?? "any"
    );
  }

  private withoutType(): ExerciseSelection {
    return this.withType("any");
  }

  private withoutTags(): ExerciseSelection {
    return new ExerciseSelection({ ...this.fields, tags: [] });
  }

  private withoutEquipment(): ExerciseSelection {
    return this.withEquipment("any");
  }

  private matchesSearch(item: ExerciseListingItem): boolean {
    const needle = this.fields.query.trim().toLowerCase();

    return [item.name, ...item.primaryMuscles].some((text) =>
      text.toLowerCase().includes(needle),
    );
  }

  private matchesType(item: ExerciseListingItem): boolean {
    return this.fields.type === "any" || item.type === this.fields.type;
  }

  private matchesTags(item: ExerciseListingItem): boolean {
    return (
      this.fields.tags.length === 0 ||
      this.fields.tags.some((tag) => item.tags.includes(tag))
    );
  }

  private matchesEquipment(item: ExerciseListingItem): boolean {
    return this.fields.equipment === "any" || item.equipment.length === 0;
  }

  private countingEach<Value extends string>(
    values: readonly Value[],
    items: readonly ExerciseListingItem[],
    holds: (item: ExerciseListingItem, value: Value) => boolean,
  ): Record<Value, number> {
    return Object.fromEntries(
      values.map((value) => [
        value,
        items.filter((item) => holds(item, value)).length,
      ]),
    ) as Record<Value, number>;
  }
}

export type ExerciseStatus = "active" | "archived";
export const EXERCISE_STATUSES: readonly ExerciseStatus[] = [
  "active",
  "archived",
];

export function countExercisesByStatus(
  items: readonly { status: ExerciseStatus }[],
): Record<ExerciseStatus, number> {
  return {
    active: items.filter(({ status }) => status === "active").length,
    archived: items.filter(({ status }) => status === "archived").length,
  };
}

export type ExerciseSortKey = "name" | "difficulty";
export const DEFAULT_EXERCISE_SORT_KEY: ExerciseSortKey = "name";
export const EXERCISE_SORT_DEFAULT_DIRECTIONS: Record<
  ExerciseSortKey,
  "asc" | "desc"
> = { name: "asc", difficulty: "asc" };

type ExerciseSortableItem = Pick<ExerciseListingItem, "name" | "difficulty">;

const COMPARISONS: Record<
  ExerciseSortKey,
  (one: ExerciseSortableItem, other: ExerciseSortableItem) => number
> = {
  name: compareNames,
  difficulty: (one, other) =>
    DIFFICULTIES.indexOf(one.difficulty) -
      DIFFICULTIES.indexOf(other.difficulty) || compareNames(one, other),
};

function compareNames(
  one: ExerciseSortableItem,
  other: ExerciseSortableItem,
): number {
  return one.name.localeCompare(other.name, undefined, { sensitivity: "base" });
}

export function sortExercises<Item extends ExerciseSortableItem>(
  items: readonly Item[],
  sort: { key: ExerciseSortKey; direction: "asc" | "desc" },
): Item[] {
  const factor = sort.direction === "asc" ? 1 : -1;

  return [...items].sort(
    (one, other) => COMPARISONS[sort.key](one, other) * factor,
  );
}
