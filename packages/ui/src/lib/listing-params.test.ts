import { describe, expect, it } from "vitest";

import {
  haveOnlyListingParamsChanged,
  pathForPageOf,
  setParamUnlessDefault,
} from "./listing-params";

const LISTING_PARAMS = ["when", "q", "page", "sort", "dir"];

describe("telling a change only the browser has to answer", () => {
  it("recognises a change of the listing's own parameters", () => {
    // arrange
    const listing = new URL(
      "https://evoa.test/coach/assessment-calls?when=past",
    );
    const paged = new URL(
      "https://evoa.test/coach/assessment-calls?when=past&page=2",
    );
    const sorted = new URL(
      "https://evoa.test/coach/assessment-calls?when=past&sort=name&dir=desc",
    );

    // act
    const answers = [paged, sorted].map((next) =>
      haveOnlyListingParamsChanged(listing, next, LISTING_PARAMS),
    );

    // assert
    expect(answers).toEqual([true, true]);
  });

  it("leaves the same address and another page to the server", () => {
    // arrange
    const listing = new URL(
      "https://evoa.test/coach/assessment-calls?when=past",
    );
    const elsewhere = new URL("https://evoa.test/coach/");

    // act
    const answers = [listing, elsewhere].map((next) =>
      haveOnlyListingParamsChanged(listing, next, LISTING_PARAMS),
    );

    // assert
    expect(answers).toEqual([false, false]);
  });

  it("leaves a change of a parameter outside the listing to the server", () => {
    // arrange
    const listing = new URL("https://evoa.test/coach/assessment-calls");
    const filtered = new URL(
      "https://evoa.test/coach/assessment-calls?status=paid",
    );

    // act
    const withStatus = haveOnlyListingParamsChanged(listing, filtered, [
      ...LISTING_PARAMS,
      "status",
    ]);
    const withoutStatus = haveOnlyListingParamsChanged(
      listing,
      filtered,
      LISTING_PARAMS,
    );

    // assert
    expect(withStatus).toBe(true);
    expect(withoutStatus).toBe(false);
  });
});

describe("writing a parameter unless it holds its default", () => {
  it("sets a value other than the default", () => {
    // arrange
    const params = new URLSearchParams("q=ana");

    // act
    setParamUnlessDefault(params, "when", {
      defaultValue: "all",
      value: "past",
    });

    // assert
    expect(params.toString()).toBe("q=ana&when=past");
  });

  it("removes the parameter when the default is chosen", () => {
    // arrange
    const params = new URLSearchParams("q=ana&when=past");

    // act
    setParamUnlessDefault(params, "when", {
      defaultValue: "all",
      value: "all",
    });

    // assert
    expect(params.toString()).toBe("q=ana");
  });
});

describe("the path to a page of the listing", () => {
  const address = {
    pageParam: "page",
    pathname: "/coach/training",
    searchParams: new URLSearchParams("type=resistance&page=2"),
  };

  it("keeps the other parameters and names the chosen page", () => {
    // arrange
    const page = 3;

    // act
    const path = pathForPageOf(address, page);

    // assert
    expect(path).toBe("/coach/training?type=resistance&page=3");
  });

  it("drops the page parameter for the first page", () => {
    // arrange
    const page = 1;

    // act
    const path = pathForPageOf(address, page);

    // assert
    expect(path).toBe("/coach/training?type=resistance");
  });

  it("is the bare path for the first page of an unfiltered listing", () => {
    // arrange
    const unfiltered = {
      ...address,
      searchParams: new URLSearchParams("page=4"),
    };

    // act
    const path = pathForPageOf(unfiltered, 1);

    // assert
    expect(path).toBe("/coach/training");
  });

  it("leaves the address it was handed as it was", () => {
    // arrange
    const searchParams = new URLSearchParams("page=2");

    // act
    pathForPageOf({ ...address, searchParams }, 5);

    // assert
    expect(searchParams.toString()).toBe("page=2");
  });
});
