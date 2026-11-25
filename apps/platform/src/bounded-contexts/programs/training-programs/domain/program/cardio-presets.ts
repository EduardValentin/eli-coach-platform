import type { LibraryExercise } from "./library-exercise";
import type {
  CardioIntensity,
  CardioSegment,
  CardioSession,
} from "./program-content";
import type { BlockType } from "./vocabulary";

type CardioPresetKind = "liss" | "moderate";

type SteadyPreset = {
  name: string;
  minutes: number;
  intensity: CardioIntensity;
};

const STEADY_PRESETS: Record<CardioPresetKind, SteadyPreset> = {
  liss: { name: "Easy cardio", minutes: 30, intensity: "easy" },
  moderate: { name: "Moderate cardio", minutes: 25, intensity: "moderate" },
};

const STEADY_NAME_PATTERN = /walk|bike|cycling|ellip/i;

type CardioPresetsOptions = {
  libraryExercises: readonly LibraryExercise[];
  newId: () => string;
};

export class CardioPresets {
  constructor(private readonly options: CardioPresetsOptions) {}

  defaultsFor(type: BlockType): CardioSession[] {
    if (type === "deload") return [this.preset("liss")];
    const easy = [this.preset("liss"), this.preset("liss")];

    return type === "foundation" ? easy : [...easy, this.preset("moderate")];
  }

  private preset(kind: CardioPresetKind): CardioSession {
    const id = this.options.newId();
    const { name, minutes, intensity } = STEADY_PRESETS[kind];

    return {
      id,
      originId: id,
      name,
      segments: [this.steady(minutes, intensity)],
    };
  }

  private steady(minutes: number, intensity: CardioIntensity): CardioSegment {
    return {
      id: this.options.newId(),
      kind: "steady",
      exerciseId: this.steadyExerciseId(),
      minutes,
      intensity,
    };
  }

  private steadyExerciseId(): string {
    const cardioExercises = this.options.libraryExercises.filter(
      (exercise) => exercise.type === "cardio" && !exercise.archived,
    );
    const picked =
      cardioExercises.find((exercise) =>
        STEADY_NAME_PATTERN.test(exercise.name),
      ) ?? cardioExercises[0];

    return picked?.id ?? "";
  }
}
