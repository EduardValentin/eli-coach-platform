import { describe, expect, it } from "vitest";

import { resolveSwipeIntent } from "./swipe-intent";

describe("resolveSwipeIntent", () => {
  it.each([
    [{ dx: 2, dy: 3 }, 8, "undecided"],
    [{ dx: 10, dy: 2 }, 8, "horizontal"],
    [{ dx: 2, dy: 10 }, 8, "vertical"],
  ] as const)("resolves %j at threshold %d to %s", (delta, threshold, expected) => {
    // arrange
    // act
    const result = resolveSwipeIntent(delta, threshold);

    // assert
    expect(result).toBe(expected);
  });
});
