import { describe, expect, it } from "vitest";

import {
  headerSort,
  parseSort,
  sortParams,
  type SortRule,
} from "./listing-sort";

type Key = "name" | "added";

const RULE: SortRule<Key> = {
  defaultDirection: { added: "desc", name: "asc" },
  fallback: "name",
};

describe("reading a sort from the address", () => {
  it("reads a known key with an explicit direction", () => {
    // arrange
    const rawKey = "added";

    // act
    const sort = parseSort(RULE, rawKey, "asc");

    // assert
    expect(sort).toEqual({ direction: "asc", key: "added" });
  });

  it("falls back to the rule's key for a missing or unknown key", () => {
    // arrange
    const rawKeys = [null, "phone", "toString"];

    // act
    const sorts = rawKeys.map((rawKey) => parseSort(RULE, rawKey, null));

    // assert
    expect(sorts).toEqual([
      { direction: "asc", key: "name" },
      { direction: "asc", key: "name" },
      { direction: "asc", key: "name" },
    ]);
  });

  it("falls back to the key's own direction for a missing or unknown direction", () => {
    // arrange
    const rawDirections = [null, "sideways"];

    // act
    const sorts = rawDirections.map((rawDirection) =>
      parseSort(RULE, "added", rawDirection),
    );

    // assert
    expect(sorts).toEqual([
      { direction: "desc", key: "added" },
      { direction: "desc", key: "added" },
    ]);
  });
});

describe("writing a sort to the address", () => {
  it("leaves both parameters out for the rule's default sort", () => {
    // arrange
    const sort = { direction: "asc", key: "name" } as const;

    // act
    const params = sortParams(RULE, sort);

    // assert
    expect(params).toEqual({ dir: null, sort: null });
  });

  it("writes a key other than the fallback and leaves its own direction out", () => {
    // arrange
    const sort = { direction: "desc", key: "added" } as const;

    // act
    const params = sortParams(RULE, sort);

    // assert
    expect(params).toEqual({ dir: null, sort: "added" });
  });

  it("writes a direction off the key's default", () => {
    // arrange
    const sort = { direction: "desc", key: "name" } as const;

    // act
    const params = sortParams(RULE, sort);

    // assert
    expect(params).toEqual({ dir: "desc", sort: null });
  });
});

describe("sorting from a column head", () => {
  it("flips the direction when the head of the current key is chosen again", () => {
    // arrange
    const current = { direction: "asc", key: "name" } as const;

    // act
    const next = headerSort(RULE, current, "name");

    // assert
    expect(next).toEqual({ direction: "desc", key: "name" });
  });

  it("starts another key at its own default direction", () => {
    // arrange
    const current = { direction: "desc", key: "name" } as const;

    // act
    const next = headerSort(RULE, current, "added");

    // assert
    expect(next).toEqual({ direction: "desc", key: "added" });
  });
});
