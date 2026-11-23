import { describe, expect, it } from "vitest";

import type { CardioSession, Session } from "./program-content";
import { SessionTiming } from "./session-timing";

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: "session",
    originId: "session",
    name: "Full Body A",
    warmUp: { items: [] },
    coolDown: { enabled: false, items: [] },
    rows: [],
    ...overrides,
  };
}

describe("SessionTiming routineMinutes", () => {
  it("estimates an empty session at zero minutes", () => {
    // act
    const minutes = SessionTiming.routineMinutes(session());

    // assert
    expect(minutes).toBe(0);
  });

  it("adds the warm-up items and, while it is on, the cool-down stretches by their own amounts", () => {
    // arrange
    const routine = session({
      warmUp: {
        items: [
          {
            id: "w1",
            exerciseId: "hip-switch",
            sets: 2,
            reps: { min: 5, max: 5 },
          },
          { id: "w2", exerciseId: "plank", sets: 1, seconds: 30 },
        ],
      },
      coolDown: {
        enabled: true,
        items: [
          { id: "c1", exerciseId: "child-pose", seconds: 30 },
          { id: "c2", exerciseId: "pigeon", seconds: 30 },
        ],
      },
    });

    // act
    const withCoolDown = SessionTiming.routineMinutes(routine);
    const withoutCoolDown = SessionTiming.routineMinutes({
      ...routine,
      coolDown: { ...routine.coolDown, enabled: false },
    });

    // assert
    expect(withCoolDown).toBe(3);
    expect(withoutCoolDown).toBe(2);
  });
});

describe("SessionTiming estimatedDuration", () => {
  it("marks an estimate as approximate but states zero plainly", () => {
    // act
    const texts = [
      SessionTiming.estimatedDuration(0),
      SessionTiming.estimatedDuration(13),
    ];

    // assert
    expect(texts).toEqual(["0 min", "~13 min"]);
  });
});

describe("SessionTiming cardioMinutes", () => {
  it("adds up the minutes of a cardio day's segments", () => {
    // arrange
    const cardio: CardioSession = {
      id: "cardio",
      originId: "cardio",
      name: "Easy cardio",
      segments: [
        {
          id: "s1",
          kind: "steady",
          exerciseId: "bike",
          minutes: 25,
          intensity: "easy",
        },
        {
          id: "s2",
          kind: "steady",
          exerciseId: "bike",
          minutes: 5,
          intensity: "moderate",
        },
      ],
    };

    // act
    const minutes = SessionTiming.cardioMinutes(cardio);

    // assert
    expect(minutes).toBe(30);
  });

  it("times an empty cardio day at zero minutes", () => {
    // act
    const minutes = SessionTiming.cardioMinutes({
      id: "cardio",
      originId: "cardio",
      name: "Cardio",
      segments: [],
    });

    // assert
    expect(minutes).toBe(0);
  });
});
