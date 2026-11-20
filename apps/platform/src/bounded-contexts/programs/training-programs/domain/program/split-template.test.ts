import { describe, expect, it } from "vitest";

import type { CardioSession } from "./program-content";
import { SplitTemplate } from "./split-template";

function cardio(id: string): CardioSession {
  return { id, originId: id, name: "Easy cardio", segments: [] };
}

describe("SplitTemplate", () => {
  it("labels each split", () => {
    // act
    const fullBody = SplitTemplate.of("full-body");
    const upperLower = SplitTemplate.of("upper-lower");

    // assert
    expect([fullBody.shape, fullBody.label]).toEqual([
      "full-body",
      "Full Body",
    ]);
    expect([upperLower.shape, upperLower.label]).toEqual([
      "upper-lower",
      "Upper / Lower",
    ]);
  });

  it("picks the split shape from the days", () => {
    // act
    const shapes = [2, 3, 4, 5].map(
      (days) => SplitTemplate.forTrainingDays(days).shape,
    );

    // assert
    expect(shapes).toEqual([
      "full-body",
      "full-body",
      "upper-lower",
      "upper-lower",
    ]);
  });

  it("names Full Body sessions by the day count, up to five days", () => {
    // act
    const two = SplitTemplate.of("full-body").sessionNames(2);
    const five = SplitTemplate.of("full-body").sessionNames(5);

    // assert
    expect(two).toEqual(["Full Body A", "Full Body B"]);
    expect(five).toEqual([
      "Full Body A",
      "Full Body B",
      "Full Body C",
      "Full Body D",
      "Full Body E",
    ]);
  });

  it("alternates lower and upper sessions and repeats Lower on a fifth day", () => {
    // act
    const four = SplitTemplate.of("upper-lower").sessionNames(4);
    const five = SplitTemplate.of("upper-lower").sessionNames(5);

    // assert
    expect(four).toEqual(["Lower A", "Upper A", "Lower B", "Upper B"]);
    expect(five).toEqual([
      "Lower A",
      "Upper A",
      "Lower B",
      "Upper B",
      "Lower C",
    ]);
  });

  it("lays the sessions out across the week", () => {
    // act
    const layouts = [
      SplitTemplate.of("full-body").layout(2),
      SplitTemplate.of("full-body").layout(3),
      SplitTemplate.of("upper-lower").layout(4),
      SplitTemplate.of("upper-lower").layout(5),
      SplitTemplate.of("full-body").layout(4),
      SplitTemplate.of("upper-lower").layout(2),
    ];

    // assert
    expect(layouts).toEqual([
      ["mon", "thu"],
      ["mon", "wed", "fri"],
      ["mon", "tue", "thu", "fri"],
      ["mon", "tue", "wed", "fri", "sat"],
      ["mon", "tue", "thu", "fri"],
      ["mon", "thu"],
    ]);
  });
});

describe("SplitTemplate weekly calendar", () => {
  it("places three Full Body sessions on the split layout with cardio between and rest after", () => {
    // act
    const calendar = SplitTemplate.of("full-body").weeklyCalendar(
      ["s1", "s2", "s3"],
      [cardio("c1"), cardio("c2")],
    );

    // assert
    expect(calendar).toEqual({
      mon: { kind: "session", sessionId: "s1" },
      tue: { kind: "cardio", cardioId: "c1" },
      wed: { kind: "session", sessionId: "s2" },
      thu: { kind: "cardio", cardioId: "c2" },
      fri: { kind: "session", sessionId: "s3" },
      sat: { kind: "rest" },
      sun: { kind: "rest" },
    });
  });

  it("places two Full Body sessions on Monday and Thursday", () => {
    // act
    const calendar = SplitTemplate.of("full-body").weeklyCalendar(
      ["s1", "s2"],
      [cardio("c1"), cardio("c2"), cardio("c3")],
    );

    // assert
    expect(calendar).toEqual({
      mon: { kind: "session", sessionId: "s1" },
      tue: { kind: "cardio", cardioId: "c1" },
      wed: { kind: "cardio", cardioId: "c2" },
      thu: { kind: "session", sessionId: "s2" },
      fri: { kind: "cardio", cardioId: "c3" },
      sat: { kind: "rest" },
      sun: { kind: "rest" },
    });
  });

  it("places five Upper / Lower sessions with cardio on the free days in order", () => {
    // act
    const calendar = SplitTemplate.of("upper-lower").weeklyCalendar(
      ["a", "b", "c", "d", "e"],
      [cardio("c1"), cardio("c2")],
    );

    // assert
    expect(calendar).toEqual({
      mon: { kind: "session", sessionId: "a" },
      tue: { kind: "session", sessionId: "b" },
      wed: { kind: "session", sessionId: "c" },
      thu: { kind: "cardio", cardioId: "c1" },
      fri: { kind: "session", sessionId: "d" },
      sat: { kind: "session", sessionId: "e" },
      sun: { kind: "cardio", cardioId: "c2" },
    });
  });
});
