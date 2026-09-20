import { describe, expect, it } from "vitest";

import { CoachMeetingRoom } from "./index";

describe("CoachMeetingRoom.from", () => {
  it("reports unset for null", () => {
    // arrange & act
    const result = CoachMeetingRoom.from(null);

    // assert
    expect(result).toEqual({ status: "unset" });
  });

  it.each([[""], ["   "]])("reports unset for %o", (raw) => {
    // arrange & act
    const result = CoachMeetingRoom.from(raw);

    // assert
    expect(result).toEqual({ status: "unset" });
  });

  it("trims surrounding whitespace before storing the room", () => {
    // arrange & act
    const result = CoachMeetingRoom.from("  https://meet.example.com/room  ");

    // assert
    expect(result.status).toBe("set");
    expect(result.status === "set" && result.room.url).toBe(
      "https://meet.example.com/room",
    );
  });

  it("accepts an absolute https url", () => {
    // arrange & act
    const result = CoachMeetingRoom.from(
      "https://meet.google.com/abc-defg-hij",
    );

    // assert
    expect(result.status).toBe("set");
    expect(result.status === "set" && result.room.url).toBe(
      "https://meet.google.com/abc-defg-hij",
    );
  });

  it.each([
    ["http://meet.example.com/room"],
    ["ftp://meet.example.com/room"],
    ["meet.example.com/room"],
    ["not a url"],
  ])("reports invalid for %o", (raw) => {
    // arrange & act
    const result = CoachMeetingRoom.from(raw);

    // assert
    expect(result).toEqual({ status: "invalid" });
  });

  it("reports invalid for a url longer than 2048 characters", () => {
    // arrange
    const overlong = `https://meet.example.com/${"a".repeat(2048)}`;

    // act
    const result = CoachMeetingRoom.from(overlong);

    // assert
    expect(result).toEqual({ status: "invalid" });
  });
});
