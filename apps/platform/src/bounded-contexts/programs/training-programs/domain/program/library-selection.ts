import type {
  Equipment,
  ExerciseTag,
  LibraryExercise,
  MovementPattern,
  Muscle,
} from "./library-exercise";
import type { LibraryTarget } from "./library-target";
import type { Block } from "./program-content";

export type LibraryType = "resistance" | "mobility" | "stretching" | "cardio";

/** What a target offers: the type the panel opens on, a tag that type also takes in, and the patterns it starts narrowed to. */
export type LibraryOffer = {
  type: LibraryType;
  alsoTagged?: ExerciseTag;
  patterns: MovementPattern[];
};

export type ActiveFilter =
  | { kind: "search"; query: string }
  | { kind: "pattern"; pattern: MovementPattern }
  | { kind: "muscle"; muscle: Muscle }
  | { kind: "only-her-equipment" }
  | { kind: "bodyweight" };

type LibrarySelectionFields = {
  type: LibraryType;
  query: string;
  patterns: MovementPattern[];
  muscles: Muscle[];
  onlyHerEquipment: boolean;
  bodyweightOnly: boolean;
  offer: LibraryOffer | null;
};

type OfferSource = {
  block: Block;
  libraryExercises: readonly LibraryExercise[];
};

const CLEARED: LibrarySelectionFields = {
  type: "resistance",
  query: "",
  patterns: [],
  muscles: [],
  onlyHerEquipment: false,
  bodyweightOnly: false,
  offer: null,
};

const WARM_UP_OFFER: LibraryOffer = {
  type: "mobility",
  alsoTagged: "Conditioning",
  patterns: [],
};
const COOL_DOWN_OFFER: LibraryOffer = { type: "stretching", patterns: [] };
const SLOT_OFFER: LibraryOffer = { type: "resistance", patterns: [] };

/** Which of her library exercises the builder's library panel offers, by type, filters and the target it adds to. */
export class LibrarySelection {
  private constructor(private readonly fields: LibrarySelectionFields) {}

  /** The panel opens on resistance exercises, limited to her equipment. */
  static initial(): LibrarySelection {
    return new LibrarySelection({ ...CLEARED, onlyHerEquipment: true });
  }

  static offerFor(
    target: LibraryTarget,
    { block, libraryExercises }: OfferSource,
  ): LibraryOffer | null {
    const session = block.sessions.find(
      (other) => other.id === target.sessionId,
    );
    if (!session) return null;
    if (target.kind === "warm-up") return WARM_UP_OFFER;
    if (target.kind === "cool-down") return COOL_DOWN_OFFER;
    if (target.kind === "slot") return SLOT_OFFER;
    const row = session.rows.find((other) => other.id === target.rowId);
    const pattern = libraryExercises.find(
      (exercise) => exercise.id === row?.exerciseId,
    )?.pattern;

    return { type: "resistance", patterns: pattern ? [pattern] : [] };
  }

  get type(): LibraryType {
    return this.fields.type;
  }

  get query(): string {
    return this.fields.query;
  }

  get patterns(): readonly MovementPattern[] {
    return this.fields.patterns;
  }

  get muscles(): readonly Muscle[] {
    return this.fields.muscles;
  }

  get onlyHerEquipment(): boolean {
    return this.fields.onlyHerEquipment;
  }

  get bodyweightOnly(): boolean {
    return this.fields.bodyweightOnly;
  }

  offered(
    libraryExercises: readonly LibraryExercise[],
    libraryEquipment: readonly Equipment[],
  ): LibraryExercise[] {
    return libraryExercises.filter(
      (exercise) =>
        !exercise.archived &&
        this.matchesType(exercise) &&
        this.matchesSearch(exercise) &&
        this.matchesPatterns(exercise) &&
        this.matchesMuscles(exercise) &&
        this.matchesEquipment(exercise, libraryEquipment),
    );
  }

  /** The filters set in the panel, which its Filters button counts. */
  panelFilters(): ActiveFilter[] {
    const { patterns, muscles, onlyHerEquipment, bodyweightOnly } = this.fields;
    const shownPatterns = this.fields.type === "resistance" ? patterns : [];

    return [
      ...shownPatterns.map((pattern): ActiveFilter => ({
        kind: "pattern",
        pattern,
      })),
      ...muscles.map((muscle): ActiveFilter => ({ kind: "muscle", muscle })),
      ...(onlyHerEquipment ? [{ kind: "only-her-equipment" } as const] : []),
      ...(bodyweightOnly ? [{ kind: "bodyweight" } as const] : []),
    ];
  }

  /** Every filter narrowing the list, the search first, as the chips list them when nothing matches. */
  activeFilters(): ActiveFilter[] {
    const query = this.fields.query.trim();
    const search: ActiveFilter[] = query ? [{ kind: "search", query }] : [];

    return [...search, ...this.panelFilters()];
  }

  /** A new target sets the type and patterns it offers and turns bodyweight off; the search, muscles and her equipment stay. */
  forOffer(offer: LibraryOffer): LibrarySelection {
    return new LibrarySelection({
      ...this.fields,
      type: offer.type,
      patterns: [...offer.patterns],
      bodyweightOnly: false,
      offer,
    });
  }

  withType(type: LibraryType): LibrarySelection {
    return new LibrarySelection({ ...this.fields, type });
  }

  withQuery(query: string): LibrarySelection {
    return new LibrarySelection({ ...this.fields, query });
  }

  withPatternToggled(pattern: MovementPattern): LibrarySelection {
    return new LibrarySelection({
      ...this.fields,
      patterns: LibrarySelection.toggled(this.fields.patterns, pattern),
    });
  }

  withMuscleToggled(muscle: Muscle): LibrarySelection {
    return new LibrarySelection({
      ...this.fields,
      muscles: LibrarySelection.toggled(this.fields.muscles, muscle),
    });
  }

  withOnlyHerEquipmentToggled(): LibrarySelection {
    return new LibrarySelection({
      ...this.fields,
      onlyHerEquipment: !this.fields.onlyHerEquipment,
    });
  }

  withBodyweightToggled(): LibrarySelection {
    return new LibrarySelection({
      ...this.fields,
      bodyweightOnly: !this.fields.bodyweightOnly,
    });
  }

  withoutFilter(filter: ActiveFilter): LibrarySelection {
    const { fields } = this;
    if (filter.kind === "search") return this.withQuery("");
    if (filter.kind === "pattern") {
      return new LibrarySelection({
        ...fields,
        patterns: fields.patterns.filter((other) => other !== filter.pattern),
      });
    }
    if (filter.kind === "muscle") {
      return new LibrarySelection({
        ...fields,
        muscles: fields.muscles.filter((other) => other !== filter.muscle),
      });
    }
    if (filter.kind === "only-her-equipment") {
      return new LibrarySelection({ ...fields, onlyHerEquipment: false });
    }

    return new LibrarySelection({ ...fields, bodyweightOnly: false });
  }

  withPanelFiltersCleared(): LibrarySelection {
    const { type, query, offer } = this.fields;

    return new LibrarySelection({ ...CLEARED, type, query, offer });
  }

  cleared(): LibrarySelection {
    const { type, offer } = this.fields;

    return new LibrarySelection({ ...CLEARED, type, offer });
  }

  private static toggled<Value extends string>(
    values: readonly Value[],
    value: Value,
  ): Value[] {
    return values.includes(value)
      ? values.filter((other) => other !== value)
      : [...values, value];
  }

  private static anyOf<Value>(
    chosen: readonly Value[],
    values: readonly Value[],
  ): boolean {
    return (
      chosen.length === 0 || values.some((value) => chosen.includes(value))
    );
  }

  private matchesType(exercise: LibraryExercise): boolean {
    const { type, offer } = this.fields;
    const alsoTagged = offer?.type === type ? offer.alsoTagged : undefined;

    return (
      exercise.type === type ||
      (alsoTagged !== undefined && exercise.tags.includes(alsoTagged))
    );
  }

  private matchesSearch(exercise: LibraryExercise): boolean {
    const needle = this.fields.query.trim().toLowerCase();

    return exercise.name.toLowerCase().includes(needle);
  }

  private matchesPatterns(exercise: LibraryExercise): boolean {
    if (this.fields.type !== "resistance") return true;

    return LibrarySelection.anyOf(
      this.fields.patterns,
      exercise.pattern ? [exercise.pattern] : [],
    );
  }

  private matchesMuscles(exercise: LibraryExercise): boolean {
    return LibrarySelection.anyOf(this.fields.muscles, exercise.primaryMuscles);
  }

  private matchesEquipment(
    exercise: LibraryExercise,
    libraryEquipment: readonly Equipment[],
  ): boolean {
    const { onlyHerEquipment, bodyweightOnly } = this.fields;
    if (bodyweightOnly && exercise.equipment.length > 0) return false;

    return (
      !onlyHerEquipment ||
      exercise.equipment.every((item) => libraryEquipment.includes(item))
    );
  }
}
