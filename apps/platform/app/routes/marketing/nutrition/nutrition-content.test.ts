import { describe, expect, it } from "vitest";

import {
  cycleNutritionDays,
  cycleNutritionPhaseMilestones,
  getCycleNutritionDayForProgress,
  getCycleNutritionMilestoneForProgress,
} from "./nutrition-content";

describe("cycle nutrition content", () => {
  it("models all 28 cycle days with the expected phase ranges", () => {
    expect(cycleNutritionDays).toHaveLength(28);
    expect(cycleNutritionDays.map((day) => day.day)).toEqual(
      Array.from({ length: 28 }, (_, index) => index + 1),
    );

    expect(cycleNutritionDays.slice(0, 5).every((day) => day.phase === "menstrual")).toBe(
      true,
    );
    expect(cycleNutritionDays.slice(5, 13).every((day) => day.phase === "follicular")).toBe(
      true,
    );
    expect(cycleNutritionDays.slice(13, 16).every((day) => day.phase === "ovulatory")).toBe(
      true,
    );
    expect(cycleNutritionDays.slice(16).every((day) => day.phase === "luteal")).toBe(true);
  });

  it("keeps the four phase milestones in scroll order", () => {
    expect(cycleNutritionPhaseMilestones.map((milestone) => milestone.day)).toEqual([
      1, 6, 14, 17,
    ]);
    expect(cycleNutritionPhaseMilestones.map((milestone) => milestone.title)).toEqual([
      "Menstrual",
      "Follicular",
      "Ovulatory",
      "Luteal",
    ]);
  });

  it("uses the prototype food cue copy for each phase", () => {
    expect(cycleNutritionPhaseMilestones.map((milestone) => milestone.cue)).toEqual([
      "Warm, easy-to-digest foods. A bit more iron.",
      "Lighter, fresher meals as your energy comes back.",
      "Raw veggies, fiber-forward, lighter portions.",
      "A few more complex carbs and root veggies to support the wind-down.",
    ]);
  });

  it("maps scroll progress through one full prototype rotation from day 25", () => {
    expect(getCycleNutritionDayForProgress(-0.2).day).toBe(25);
    expect(getCycleNutritionDayForProgress(0).day).toBe(25);
    expect(getCycleNutritionDayForProgress(17 / 28).day).toBe(14);
    expect(getCycleNutritionDayForProgress(20 / 28).day).toBe(17);
    expect(getCycleNutritionDayForProgress(27 / 28).day).toBe(24);
    expect(getCycleNutritionDayForProgress(1).day).toBe(25);
    expect(getCycleNutritionDayForProgress(1.2).day).toBe(25);
  });

  it("snaps reduced-motion progress through the four face milestones", () => {
    expect(getCycleNutritionMilestoneForProgress(-0.2).day).toBe(1);
    expect(getCycleNutritionMilestoneForProgress(0).day).toBe(1);
    expect(getCycleNutritionMilestoneForProgress(0.25).day).toBe(6);
    expect(getCycleNutritionMilestoneForProgress(0.5).day).toBe(14);
    expect(getCycleNutritionMilestoneForProgress(0.75).day).toBe(17);
    expect(getCycleNutritionMilestoneForProgress(1.2).day).toBe(17);
  });
});
