import { describe, expect, it } from "vitest";

import { CheckInNote, MAX_CHECK_IN_NOTE_LENGTH } from "./check-in-note";

describe("CheckInNote.from", () => {
  it("keeps the note without its surrounding spaces", () => {
    // arrange
    const raw = "  Can we look at my squat?\n";

    // act
    const written = CheckInNote.from(raw);

    // assert
    expect(written).toEqual({
      status: "accepted",
      note: expect.objectContaining({ text: "Can we look at my squat?" }),
    });
  });

  it.each([
    ["no note", null],
    ["an empty note", ""],
    ["a note of only spaces", "   \n "],
  ])("accepts %s as no note", (_situation, raw) => {
    // arrange
    const input = raw;

    // act
    const written = CheckInNote.from(input);

    // assert
    expect(written).toEqual({ status: "accepted", note: null });
  });

  it("accepts a note of the longest length once trimmed", () => {
    // arrange
    const raw = ` ${"a".repeat(MAX_CHECK_IN_NOTE_LENGTH)} `;

    // act
    const written = CheckInNote.from(raw);

    // assert
    expect(written.status).toBe("accepted");
  });

  it("refuses a note longer than the limit", () => {
    // arrange
    const raw = "a".repeat(MAX_CHECK_IN_NOTE_LENGTH + 1);

    // act
    const written = CheckInNote.from(raw);

    // assert
    expect(written).toEqual({ status: "too_long" });
  });
});
