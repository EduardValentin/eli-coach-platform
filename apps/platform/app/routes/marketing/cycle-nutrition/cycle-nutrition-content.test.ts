import { describe, expect, it } from "vitest";

import {
  CYCLE_DAY_COUNT,
  CYCLE_NUTRITION_PHASES,
  getCycleNutritionViewState,
  getPhaseForCycleDay,
  getPillPresentation,
} from "./cycle-nutrition-content";

describe("cycle nutrition content model", () => {
  it("maps all 28 days to the canonical phase ranges", () => {
    // arrange
    // act
    // assert
    expect(Array.from({ length: 5 }, (_, index) => getPhaseForCycleDay(index + 1).id)).toEqual(
      Array(5).fill("menstrual"),
    );
    expect(Array.from({ length: 8 }, (_, index) => getPhaseForCycleDay(index + 6).id)).toEqual(
      Array(8).fill("follicular"),
    );
    expect(Array.from({ length: 3 }, (_, index) => getPhaseForCycleDay(index + 14).id)).toEqual(
      Array(3).fill("ovulatory"),
    );
    expect(Array.from({ length: 12 }, (_, index) => getPhaseForCycleDay(index + 17).id)).toEqual(
      Array(12).fill("luteal"),
    );
  });

  it("derives one full native-scroll rotation from the prototype start day", () => {
    // arrange
    // act
    // assert
    expect(CYCLE_DAY_COUNT).toBe(28);

    expect(getCycleNutritionViewState({ prefersReducedMotion: false, progress: 0 })).toMatchObject({
      activeDay: 25,
      rotationDegrees: -((25 - 1) * (360 / 28)),
    });
    expect(getCycleNutritionViewState({ prefersReducedMotion: false, progress: 4 / 28 })).toMatchObject({
      activeDay: 1,
      phase: CYCLE_NUTRITION_PHASES[0],
    });
    expect(getCycleNutritionViewState({ prefersReducedMotion: false, progress: 17 / 28 })).toMatchObject({
      activeDay: 14,
      phase: CYCLE_NUTRITION_PHASES[2],
    });
    expect(getCycleNutritionViewState({ prefersReducedMotion: false, progress: 1 })).toMatchObject({
      activeDay: 25,
      rotationDegrees: -((25 - 1) * (360 / 28)) - 360,
    });
  });

  it("snaps reduced-motion state to phase anchor days while preserving phase order", () => {
    // arrange
    // act
    // assert
    expect(getCycleNutritionViewState({ prefersReducedMotion: true, progress: 0 })).toMatchObject({
      activeDay: 25,
      phase: CYCLE_NUTRITION_PHASES[3],
    });
    expect(getCycleNutritionViewState({ prefersReducedMotion: true, progress: 4 / 28 })).toMatchObject({
      activeDay: 1,
      phase: CYCLE_NUTRITION_PHASES[0],
    });
    expect(getCycleNutritionViewState({ prefersReducedMotion: true, progress: 10 / 28 })).toMatchObject({
      activeDay: 6,
      phase: CYCLE_NUTRITION_PHASES[1],
    });
    expect(getCycleNutritionViewState({ prefersReducedMotion: true, progress: 17 / 28 })).toMatchObject({
      activeDay: 14,
      phase: CYCLE_NUTRITION_PHASES[2],
    });
  });

  it("keeps pill emphasis aligned with the prototype pattern", () => {
    // arrange
    // act
    // assert
    expect(getPillPresentation(1, 1)).toMatchObject({
      isCurrent: true,
      isStriped: false,
      opacity: 1,
      phaseId: "menstrual",
    });
    expect(getPillPresentation(23, 25)).toMatchObject({
      isCurrent: false,
      isStriped: true,
      phaseId: "menstrual",
    });
    expect(getPillPresentation(6, 25)).toMatchObject({
      isCurrent: false,
      isStriped: true,
      phaseId: "menstrual",
    });
    expect(getPillPresentation(14, 25)).toMatchObject({
      isCurrent: false,
      isStriped: false,
      opacity: 0.12,
      phaseId: "ovulatory",
    });
  });

  it("keeps the updated phase nutrition cues concise", () => {
    // arrange
    // act
    const phaseCues = CYCLE_NUTRITION_PHASES.map((phase) => phase.cue);

    // assert
    expect(phaseCues).toEqual([
      "Warm, easy-to-digest foods with iron-rich options.",
      "Lighter, fresher meals as your energy comes back.",
      "Colorful veggies · Fiber-rich meals · Fresh, balanced plates",
      "Complex carbs, protein-rich meals and root vegetables.",
    ]);
  });
});
