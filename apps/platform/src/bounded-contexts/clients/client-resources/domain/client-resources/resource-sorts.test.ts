import { describe, expect, it } from "vitest";

import {
  RESOURCE_SORT_KEYS,
  defaultResourceSortDirection,
} from "./resource-sorts";

describe("resource sorts", () => {
  it("sorts by the date added or by the title", () => {
    // arrange
    const expected = ["added", "title"];

    // act
    const keys = RESOURCE_SORT_KEYS;

    // assert
    expect(keys).toEqual(expected);
  });

  it.each([
    ["added", "desc"],
    ["title", "asc"],
  ] as const)(
    "sorts by %s in %s order unless told otherwise",
    (key, direction) => {
      // arrange
      const sort = key;

      // act
      const result = defaultResourceSortDirection(sort);

      // assert
      expect(result).toBe(direction);
    },
  );
});
