import { describe, expect, it } from "vitest";

import {
  rejectsDuplicateSignup,
  rejectsReducedSlot,
} from "./signup-constraint-violations.server";

function databaseError(code: string, constraint: string): Error {
  return Object.assign(new Error("database rejected the write"), {
    code,
    constraint,
  });
}

function queryErrorCausedBy(cause: Error): Error {
  return new Error("Failed query", { cause });
}

describe("rejectsReducedSlot", () => {
  it.each([
    ["23505", "waitlist_entries_offer_reduced_slot_unique"],
    ["23514", "waitlist_entries_reduced_slot_range"],
  ])("recognises %s on %s behind the query error", (code, constraint) => {
    // arrange
    const error = queryErrorCausedBy(databaseError(code, constraint));

    // act
    const rejected = rejectsReducedSlot(error);

    // assert
    expect(rejected).toBe(true);
  });

  it.each([
    ["23505", "waitlist_entries_email_offer_unique"],
    ["23514", "waitlist_entries_reduced_slot_matches_pricing"],
    ["23514", "waitlist_entries_offer_reduced_slot_unique"],
    ["40001", "waitlist_entries_offer_reduced_slot_unique"],
  ])("does not recognise %s on %s", (code, constraint) => {
    // arrange
    const error = queryErrorCausedBy(databaseError(code, constraint));

    // act
    const rejected = rejectsReducedSlot(error);

    // assert
    expect(rejected).toBe(false);
  });
});

describe("rejectsDuplicateSignup", () => {
  it("recognises a unique violation on the email per offer", () => {
    // arrange
    const error = queryErrorCausedBy(
      databaseError("23505", "waitlist_entries_email_offer_unique"),
    );

    // act
    const rejected = rejectsDuplicateSignup(error);

    // assert
    expect(rejected).toBe(true);
  });

  it.each([
    ["23505", "waitlist_entries_offer_reduced_slot_unique"],
    ["23514", "waitlist_entries_email_offer_unique"],
  ])("does not recognise %s on %s", (code, constraint) => {
    // arrange
    const error = queryErrorCausedBy(databaseError(code, constraint));

    // act
    const rejected = rejectsDuplicateSignup(error);

    // assert
    expect(rejected).toBe(false);
  });

  it("does not recognise an error without a constraint", () => {
    // arrange
    const error = queryErrorCausedBy(new Error("connection terminated"));

    // act
    const rejected = rejectsDuplicateSignup(error);

    // assert
    expect(rejected).toBe(false);
  });
});
