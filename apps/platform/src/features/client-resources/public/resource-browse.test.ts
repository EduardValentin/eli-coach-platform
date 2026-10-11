import { describe, expect, it } from "vitest";

import {
  RESOURCE_BROWSE_PARAMS,
  resourceBrowseInputOf,
  writeResourceBrowse,
} from "./resource-browse";

describe("resourceBrowseInputOf", () => {
  it("reads the tag, the search, the sort and its direction as they stand in the address", () => {
    // arrange
    const params = new URLSearchParams(
      "tag=Meals&q=week%20one&sort=title&dir=desc",
    );

    // act
    const input = resourceBrowseInputOf(params);

    // assert
    expect(input).toEqual({
      tag: "Meals",
      search: "week one",
      sort: "title",
      direction: "desc",
    });
  });

  it("reads what the address leaves out as absent and what it holds unparsed", () => {
    // arrange
    const params = new URLSearchParams("sort=newest&dir=");

    // act
    const input = resourceBrowseInputOf(params);

    // assert
    expect(input).toEqual({
      tag: null,
      search: null,
      sort: "newest",
      direction: "",
    });
  });
});

describe("writeResourceBrowse", () => {
  it("writes a narrowed list into the address beside the parameters it does not own", () => {
    // arrange
    const params = new URLSearchParams("page=2");

    // act
    writeResourceBrowse(params, {
      tag: "Meals",
      search: "week",
      sort: "title",
      direction: "desc",
    });

    // assert
    expect(Object.fromEntries(params)).toEqual({
      page: "2",
      [RESOURCE_BROWSE_PARAMS.tag]: "Meals",
      [RESOURCE_BROWSE_PARAMS.search]: "week",
      [RESOURCE_BROWSE_PARAMS.sort]: "title",
      [RESOURCE_BROWSE_PARAMS.direction]: "desc",
    });
  });

  it("leaves out every choice that is the default: no tag, a blank search, the newest first", () => {
    // arrange
    const params = new URLSearchParams("tag=Meals&q=week&sort=title&dir=desc");

    // act
    writeResourceBrowse(params, {
      tag: null,
      search: "   ",
      sort: "added",
      direction: "desc",
    });

    // assert
    expect(params.toString()).toBe("");
  });

  it("keeps the sort but leaves out its direction when it is that sort's own default", () => {
    // arrange
    const params = new URLSearchParams("dir=desc");

    // act
    writeResourceBrowse(params, {
      tag: null,
      search: "",
      sort: "title",
      direction: "asc",
    });

    // assert
    expect(params.toString()).toBe("sort=title");
  });

  it("keeps the oldest-first direction of the date sort while leaving the sort out", () => {
    // arrange
    const params = new URLSearchParams();

    // act
    writeResourceBrowse(params, {
      tag: null,
      search: "",
      sort: "added",
      direction: "asc",
    });

    // assert
    expect(params.toString()).toBe("dir=asc");
  });
});
