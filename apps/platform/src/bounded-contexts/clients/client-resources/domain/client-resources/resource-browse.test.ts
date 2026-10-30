import { describe, expect, it } from "vitest";

import { ResourceBrowse, type ResourceBrowseInput } from "./resource-browse";
import { MAX_RESOURCE_TAG_LENGTH } from "./resource-tags";

const NOTHING_CHOSEN: ResourceBrowseInput = {
  tag: null,
  search: null,
  sort: null,
  direction: null,
};

describe("ResourceBrowse", () => {
  it("browses every resource, newest first, when nothing is chosen", () => {
    // arrange
    const input = NOTHING_CHOSEN;

    // act
    const browse = ResourceBrowse.from(input);

    // assert
    expect(browse.toSnapshot()).toEqual({
      tag: null,
      search: "",
      sort: "added",
      direction: "desc",
    });
  });

  it("keeps a chosen tag, search, sort and direction", () => {
    // arrange
    const input = {
      tag: "Meal Prep",
      search: "plan",
      sort: "title",
      direction: "desc",
    };

    // act
    const browse = ResourceBrowse.from(input);

    // assert
    expect(browse.toSnapshot()).toEqual({
      tag: { tag: "Meal Prep", folded: "meal prep" },
      search: "plan",
      sort: "title",
      direction: "desc",
    });
  });

  it("tidies the tag's spacing and folds it as a stored tag is folded", () => {
    // arrange
    const input = { ...NOTHING_CHOSEN, tag: "  MEAL   prep " };

    // act
    const browse = ResourceBrowse.from(input);

    // assert
    expect(browse.toSnapshot().tag).toEqual({
      tag: "MEAL prep",
      folded: "meal prep",
    });
  });

  it.each([
    ["an empty tag", ""],
    ["a blank tag", "   "],
    [
      "a tag longer than any stored tag",
      "t".repeat(MAX_RESOURCE_TAG_LENGTH + 1),
    ],
  ])("chooses no tag for %s", (_case, tag) => {
    // arrange
    const input = { ...NOTHING_CHOSEN, tag };

    // act
    const browse = ResourceBrowse.from(input);

    // assert
    expect(browse.toSnapshot().tag).toBeNull();
  });

  it.each([
    ["a blank search", "   ", ""],
    ["a search with spacing around it", "  meal plan ", "meal plan"],
  ])("trims %s", (_case, search, expected) => {
    // arrange
    const input = { ...NOTHING_CHOSEN, search };

    // act
    const browse = ResourceBrowse.from(input);

    // assert
    expect(browse.toSnapshot().search).toBe(expected);
  });

  it.each([
    ["no sort", null, "added", "desc"],
    ["an unknown sort", "size", "added", "desc"],
    ["a sort in another case", "TITLE", "added", "desc"],
    ["the title", "title", "title", "asc"],
    ["the date added", "added", "added", "desc"],
  ])(
    "for %s sorts by the known key in its own default direction",
    (_case, sort, expectedSort, expectedDirection) => {
      // arrange
      const input = { ...NOTHING_CHOSEN, sort };

      // act
      const browse = ResourceBrowse.from(input);

      // assert
      expect(browse.toSnapshot()).toMatchObject({
        sort: expectedSort,
        direction: expectedDirection,
      });
    },
  );

  it.each([
    ["the date added", "added", "asc", "asc"],
    ["the date added", "added", "sideways", "desc"],
    ["the title", "title", "desc", "desc"],
    ["the title", "title", "DESC", "asc"],
    ["the title", "title", null, "asc"],
  ])(
    "sorting by %s takes the direction %s only when it is known",
    (_case, sort, direction, expected) => {
      // arrange
      const input = { ...NOTHING_CHOSEN, sort, direction };

      // act
      const browse = ResourceBrowse.from(input);

      // assert
      expect(browse.toSnapshot().direction).toBe(expected);
    },
  );

  describe("narrowing to a tag the client holds", () => {
    const HELD = [
      { tag: "Meal Prep", folded: "meal prep" },
      { tag: "Glutes", folded: "glutes" },
    ];

    it("keeps a held tag in its stored spelling", () => {
      // arrange
      const browse = ResourceBrowse.from({
        ...NOTHING_CHOSEN,
        tag: "meal PREP",
        search: "plan",
        sort: "title",
      });

      // act
      const narrowed = browse.withTagAmong(HELD);

      // assert
      expect(narrowed.toSnapshot()).toEqual({
        tag: { tag: "Meal Prep", folded: "meal prep" },
        search: "plan",
        sort: "title",
        direction: "asc",
      });
    });

    it("falls back to no tag when the client holds none like it and keeps the rest", () => {
      // arrange
      const browse = ResourceBrowse.from({
        ...NOTHING_CHOSEN,
        tag: "Cardio",
        search: "plan",
      });

      // act
      const narrowed = browse.withTagAmong(HELD);

      // assert
      expect(narrowed.toSnapshot()).toEqual({
        tag: null,
        search: "plan",
        sort: "added",
        direction: "desc",
      });
      expect(browse.toSnapshot().tag).toEqual({
        tag: "Cardio",
        folded: "cardio",
      });
    });

    it("stays without a tag when none was chosen", () => {
      // arrange
      const browse = ResourceBrowse.from(NOTHING_CHOSEN);

      // act
      const narrowed = browse.withTagAmong(HELD);

      // assert
      expect(narrowed.toSnapshot().tag).toBeNull();
    });

    it("falls back to no tag when the client holds no tags at all", () => {
      // arrange
      const browse = ResourceBrowse.from({ ...NOTHING_CHOSEN, tag: "Glutes" });

      // act
      const narrowed = browse.withTagAmong([]);

      // assert
      expect(narrowed.toSnapshot().tag).toBeNull();
    });
  });
});
