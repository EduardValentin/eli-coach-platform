import { describe, expect, it } from "vitest";

import {
  EXERCISE_NAME_REQUIRED_MESSAGE,
  exerciseDraftSchema,
  exerciseListResponseSchema,
  exerciseMetadataSchema,
} from "./exercises";

const draft = {
  name: "Hip Thrust",
  description: "",
  difficulty: "Intermediate",
  equipment: ["Barbell", "Bench"],
  primaryMuscles: ["Glutes"],
  secondaryMuscles: ["Hamstrings"],
  tags: ["Strength", "Hypertrophy"],
};

describe("exercise contracts", () => {
  it("accepts a complete draft and trims the name", () => {
    // arrange, act
    const parsed = exerciseDraftSchema.parse({ ...draft, name: "  Hip Thrust " });

    // assert
    expect(parsed.name).toBe("Hip Thrust");
  });

  it("names the missing-name error as the prototype does", () => {
    // arrange, act
    const result = exerciseDraftSchema.safeParse({ ...draft, name: "   " });

    // assert
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      message: EXERCISE_NAME_REQUIRED_MESSAGE,
      path: ["name"],
    });
  });

  it("rejects unknown vocabulary, repeats and a muscle that is both primary and secondary", () => {
    // arrange, act, assert
    expect(
      exerciseDraftSchema.safeParse({ ...draft, equipment: ["Squat Rack"] })
        .success,
    ).toBe(false);
    expect(
      exerciseDraftSchema.safeParse({ ...draft, tags: ["Strength", "Strength"] })
        .success,
    ).toBe(false);
    expect(
      exerciseDraftSchema.safeParse({ ...draft, secondaryMuscles: ["Glutes"] })
        .success,
    ).toBe(false);
  });

  it("defaults an update's video disposition to keep", () => {
    // arrange, act
    const parsed = exerciseMetadataSchema.parse(draft);

    // assert
    expect(parsed.video).toBe("keep");
  });

  it("parses a list response", () => {
    // arrange
    const response = {
      success: true,
      exercises: [
        {
          ...draft,
          id: "7c1a0e2c-0e4b-4a4e-9d2b-1f2e3d4c5b6a",
          video: {
            url: "/api/exercises/videos/exercise-videos%2Fabc.mp4",
            sizeBytes: 12,
          },
          createdAt: "2026-09-02T00:00:00.000Z",
          updatedAt: "2026-09-02T00:00:00.000Z",
        },
      ],
    };

    // act, assert
    expect(exerciseListResponseSchema.parse(response)).toEqual(response);
  });
});
