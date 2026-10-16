import { describe, expect, it } from "vitest";

import { pageOf, paginationSteps, parsePage } from "./list-paging";

const PER_PAGE = 10;

const items = Array.from({ length: 25 }, (_, index) => `item-${index + 1}`);

describe("paging through a list", () => {
  it("shows a page of ten and says where in the run it sits", () => {
    // arrange
    const paging = { page: 2, perPage: PER_PAGE };

    // act
    const view = pageOf(items, paging);

    // assert
    expect(view.items).toEqual([
      "item-11",
      "item-12",
      "item-13",
      "item-14",
      "item-15",
      "item-16",
      "item-17",
      "item-18",
      "item-19",
      "item-20",
    ]);
    expect(view).toMatchObject({
      firstShown: 11,
      lastShown: 20,
      page: 2,
      pageCount: 3,
      total: 25,
    });
  });

  it("clamps a page past the end of the run to the last one", () => {
    // arrange
    const paging = { page: 99, perPage: PER_PAGE };

    // act
    const view = pageOf(items, paging);

    // assert
    expect(view.page).toBe(3);
    expect(view.items).toHaveLength(5);
    expect(view.firstShown).toBe(21);
    expect(view.lastShown).toBe(25);
  });

  it("counts one empty page when there is nothing to show", () => {
    // arrange
    const paging = { page: 1, perPage: PER_PAGE };

    // act
    const view = pageOf([], paging);

    // assert
    expect(view).toMatchObject({
      firstShown: 0,
      items: [],
      lastShown: 0,
      page: 1,
      pageCount: 1,
      total: 0,
    });
  });
});

describe("the page steps a pager offers", () => {
  it("lists every page while they still fit on one row", () => {
    // arrange
    const pageCount = 7;

    // act
    const steps = paginationSteps(3, pageCount);

    // assert
    expect(steps).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("gaps the pages far from the one being read", () => {
    // arrange
    const pageCount = 12;

    // act
    const steps = paginationSteps(5, pageCount);

    // assert
    expect(steps).toEqual([1, "gap", 4, 5, 6, "gap", 12]);
  });

  it("keeps the pages next to the first one without a gap before them", () => {
    // arrange
    const pageCount = 12;

    // act
    const steps = paginationSteps(1, pageCount);

    // assert
    expect(steps).toEqual([1, 2, "gap", 12]);
  });
});

describe("reading a page from the address", () => {
  it("falls back to the first page for anything that is not a page number", () => {
    // arrange
    const raw = [null, "0", "-3", "2.5", "nonsense"];

    // act
    const pages = raw.map(parsePage);

    // assert
    expect(pages).toEqual([1, 1, 1, 1, 1]);
  });

  it("reads a page number as it is written", () => {
    // arrange
    const raw = "3";

    // act
    const page = parsePage(raw);

    // assert
    expect(page).toBe(3);
  });
});
