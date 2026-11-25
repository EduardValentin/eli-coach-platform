import { describe, expect, it } from "vitest";

import type { Block, CardioSession, Session } from "./program-content";
import { SplitTemplate } from "./split-template";
import { WEEKDAYS, type SplitShape } from "./vocabulary";

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
      sessionDaysOf("full-body", 2),
      sessionDaysOf("full-body", 3),
      sessionDaysOf("upper-lower", 4),
      sessionDaysOf("upper-lower", 5),
      sessionDaysOf("full-body", 4),
      sessionDaysOf("upper-lower", 2),
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

function sessionDaysOf(shape: SplitShape, sessionCount: number) {
  const calendar = SplitTemplate.of(shape).weeklyCalendar(
    Array.from({ length: sessionCount }, (_, index) => `s${index}`),
    [],
  );

  return WEEKDAYS.filter((day) => calendar[day].kind === "session");
}

function session(id: string): Session {
  return {
    id,
    originId: id,
    name: id,
    warmUp: { items: [] },
    coolDown: { enabled: false, items: [] },
    rows: [],
  };
}

function blockWith(shape: SplitShape, sessions: Session[]): Block {
  return {
    id: "block",
    originId: "block",
    type: "hypertrophy",
    weeks: 6,
    trainingDays: 4,
    calibrationWeek: false,
    introText: "",
    clientNote: "",
    split: { shape, name: "", text: "" },
    targetMinutes: 60,
    calendar: {
      mon: { kind: "rest" },
      tue: { kind: "rest" },
      wed: { kind: "rest" },
      thu: { kind: "rest" },
      fri: { kind: "rest" },
      sat: { kind: "rest" },
      sun: { kind: "rest" },
    },
    sessions,
    cardioSessions: [],
    dailySteps: 6000,
    missedDayNote: "",
  };
}

describe("SplitTemplate slotPlanFor", () => {
  it("reads the slot plan of the session at its position in the block", () => {
    // arrange
    const sessions = ["lower-a", "upper-a", "lower-b", "upper-b"].map(session);
    const block = blockWith("upper-lower", sessions);

    // act
    const plan = SplitTemplate.slotPlanFor(block, sessions[3], "B");

    // assert
    expect(plan).toEqual({
      slot: "B",
      patterns: ["vertical-push", "horizontal-push"],
      label: "Secondary",
    });
  });

  it("joins the patterns of a slot planned as a superset", () => {
    // arrange
    const sessions = [session("a"), session("b")];
    const block = blockWith("full-body", sessions);

    // act
    const plan = SplitTemplate.slotPlanFor(block, sessions[1], "C");

    // assert
    expect(plan).toEqual({
      slot: "C",
      patterns: [
        "horizontal-push",
        "vertical-push",
        "horizontal-pull",
        "vertical-pull",
      ],
      label: "Accessories",
    });
  });

  it("finds nothing for a session outside the block", () => {
    // arrange
    const block = blockWith("full-body", [session("a"), session("b")]);

    // act
    const plan = SplitTemplate.slotPlanFor(block, session("elsewhere"), "A");

    // assert
    expect(plan).toBeUndefined();
  });
});
