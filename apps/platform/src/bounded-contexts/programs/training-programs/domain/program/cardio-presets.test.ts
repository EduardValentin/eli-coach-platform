import { describe, expect, it } from "vitest";

import type { CardioExercise } from "./cardio-exercises-port";
import { CardioPresets } from "./cardio-presets";

const ROWER: CardioExercise = { id: "rower", name: "Rowing machine" };
const TREADMILL: CardioExercise = { id: "treadmill", name: "Treadmill walk" };
const BIKE: CardioExercise = { id: "bike", name: "Stationary bike" };

function presetsOver(cardioExercises: CardioExercise[]): CardioPresets {
  let next = 0;

  return new CardioPresets({
    cardioExercises,
    newId: () => `id-${(next += 1)}`,
  });
}

describe("CardioPresets", () => {
  it("builds easy cardio as thirty easy minutes on the first walk, bike or elliptical cardio exercise", () => {
    // arrange
    const presets = presetsOver([ROWER, TREADMILL]);

    // act
    const [easy] = presets.defaultsFor("deload");

    // assert
    expect(easy.name).toBe("Easy cardio");
    expect(easy.originId).toBe(easy.id);
    expect(easy.segments).toEqual([
      {
        id: expect.any(String),
        kind: "steady",
        exerciseId: "treadmill",
        minutes: 30,
        intensity: "easy",
      },
    ]);
  });

  it("falls back to the first cardio exercise when none matches", () => {
    // arrange
    const presets = presetsOver([ROWER]);

    // act
    const [easy] = presets.defaultsFor("deload");

    // assert
    expect(easy.segments[0]).toMatchObject({ exerciseId: "rower" });
  });

  it("leaves the exercise unchosen when the coach has no cardio exercise", () => {
    // arrange
    const presets = presetsOver([]);

    // act
    const [easy] = presets.defaultsFor("deload");

    // assert
    expect(easy.segments[0]).toMatchObject({
      kind: "steady",
      exerciseId: "",
      minutes: 30,
    });
  });

  it("gives a deload one easy cardio session", () => {
    // arrange
    const presets = presetsOver([BIKE]);

    // act
    const sessions = presets.defaultsFor("deload");

    // assert
    expect(sessions.map((session) => session.name)).toEqual(["Easy cardio"]);
    expect(sessions[0].segments[0]).toMatchObject({
      kind: "steady",
      exerciseId: "bike",
    });
  });

  it("gives a foundation two easy cardio sessions", () => {
    // arrange
    const presets = presetsOver([BIKE]);

    // act
    const names = presets
      .defaultsFor("foundation")
      .map((session) => session.name);

    // assert
    expect(names).toEqual(["Easy cardio", "Easy cardio"]);
  });

  it.each(["hypertrophy", "strength"] as const)(
    "gives %s two easy and one twenty-five minute moderate session",
    (type) => {
      // arrange
      const presets = presetsOver([BIKE]);

      // act
      const sessions = presets.defaultsFor(type);

      // assert
      expect(
        sessions.map((session) => [
          session.name,
          session.segments.map(({ exerciseId, minutes, intensity }) => ({
            exerciseId,
            minutes,
            intensity,
          })),
        ]),
      ).toEqual([
        [
          "Easy cardio",
          [{ exerciseId: "bike", minutes: 30, intensity: "easy" }],
        ],
        [
          "Easy cardio",
          [{ exerciseId: "bike", minutes: 30, intensity: "easy" }],
        ],
        [
          "Moderate cardio",
          [{ exerciseId: "bike", minutes: 25, intensity: "moderate" }],
        ],
      ]);
    },
  );

  it("gives fresh ids each call", () => {
    // arrange
    const presets = presetsOver([BIKE]);

    // act
    const [first] = presets.defaultsFor("foundation");
    const [second] = presets.defaultsFor("foundation");

    // assert
    expect(first.id).not.toBe(second.id);
    expect(first.segments[0].id).not.toBe(second.segments[0].id);
  });
});
