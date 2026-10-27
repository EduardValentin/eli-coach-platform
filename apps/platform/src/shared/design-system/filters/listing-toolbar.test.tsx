// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ListingToolbar } from "./listing-toolbar";

afterEach(() => {
  cleanup();
});

describe("ListingToolbar", () => {
  it("lays the view, the filters and the search out in their slots", () => {
    // arrange, act
    const { container } = render(
      <ListingToolbar
        filters={<button type="button">Type</button>}
        filtersParity="exercise-filters"
        parity="exercise-toolbar"
        search={<input aria-label="Search exercises" />}
        searchParity="exercise-search"
        view={<button type="button">All</button>}
      />,
    );

    // assert
    const toolbar = container.querySelector('[data-parity="exercise-toolbar"]');
    const filters = container.querySelector('[data-parity="exercise-filters"]');
    const search = container.querySelector('[data-parity="exercise-search"]');
    expect(toolbar).toContainElement(
      screen.getByRole("button", { name: "All" }),
    );
    expect(filters).toContainElement(
      screen.getByRole("button", { name: "Type" }),
    );
    expect(search).toContainElement(
      screen.getByRole("textbox", { name: "Search exercises" }),
    );
  });

  it("sets the filters out as one row of equal columns from the small breakpoint", () => {
    // arrange, act
    const { container } = render(
      <ListingToolbar
        filters={<button type="button">Type</button>}
        filtersParity="exercise-filters"
      />,
    );

    // assert
    expect(
      container.querySelector('[data-parity="exercise-filters"]'),
    ).toHaveClass("grid gap-3 sm:grid-flow-col sm:auto-cols-fr");
  });

  it("renders no filters row and no search column when neither is given", () => {
    // arrange, act
    const { container } = render(
      <ListingToolbar
        filtersParity="exercise-filters"
        parity="exercise-toolbar"
        searchParity="exercise-search"
        view={<button type="button">All</button>}
      />,
    );

    // assert
    expect(
      container.querySelector('[data-parity="exercise-filters"]'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-parity="exercise-search"]'),
    ).not.toBeInTheDocument();
  });
});
