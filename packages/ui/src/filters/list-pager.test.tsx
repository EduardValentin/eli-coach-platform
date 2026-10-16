// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { pageOf } from "../lib/list-paging";
import { ListPager } from "./list-pager";

afterEach(() => {
  cleanup();
});

const PER_PAGE = 10;

function itemsCounting(total: number): string[] {
  return Array.from({ length: total }, (_, index) => `item-${index + 1}`);
}

function pathForPage(page: number): string {
  return page === 1 ? "/library" : `/library?page=${page}`;
}

function renderPager(paging: { page: number; total: number }) {
  const view = pageOf(itemsCounting(paging.total), {
    page: paging.page,
    perPage: PER_PAGE,
  });

  return render(
    <MemoryRouter>
      <ListPager pathForPage={pathForPage} view={view} />
    </MemoryRouter>,
  );
}

describe("ListPager", () => {
  it("says which run of the list is shown", () => {
    // arrange, act
    renderPager({ page: 2, total: 25 });

    // assert
    expect(screen.getByText("Showing 11–20 of 25")).toBeInTheDocument();
  });

  it("links every page, marking the current one", () => {
    // arrange, act
    renderPager({ page: 2, total: 25 });

    // assert
    const pages = screen.getByRole("navigation", { name: "pagination" });
    expect(
      within(pages).getByRole("link", { name: "Go to page 1" }),
    ).toHaveAttribute("href", "/library");
    expect(
      within(pages).getByRole("link", { name: "Go to page 2" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(pages).getByRole("link", { name: "Go to page 3" }),
    ).toHaveAttribute("href", "/library?page=3");
  });

  it("links the neighbouring pages from Previous and Next", () => {
    // arrange, act
    renderPager({ page: 2, total: 25 });

    // assert
    expect(
      screen.getByRole("link", { name: "Go to previous page" }),
    ).toHaveAttribute("href", "/library");
    expect(
      screen.getByRole("link", { name: "Go to next page" }),
    ).toHaveAttribute("href", "/library?page=3");
  });

  it("disables Previous on the first page and Next on the last", () => {
    // arrange, act
    const first = renderPager({ page: 1, total: 25 });
    const previousOnFirst = screen.getByRole("button", {
      name: "Go to previous page",
    });
    first.unmount();
    renderPager({ page: 3, total: 25 });

    // assert
    expect(previousOnFirst).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Go to next page" }),
    ).toBeDisabled();
  });

  it("gaps the pages far from the one being read", () => {
    // arrange, act
    renderPager({ page: 6, total: 120 });

    // assert
    const pages = screen.getByRole("navigation", { name: "pagination" });
    expect(
      within(pages)
        .getAllByRole("link", { name: /^Go to page/ })
        .map((link) => link.textContent),
    ).toEqual(["1", "5", "6", "7", "12"]);
    expect(within(pages).getAllByText("More pages")).toHaveLength(2);
  });

  it("marks its root for the parity check", () => {
    // arrange, act
    const { container } = renderPager({ page: 1, total: 25 });

    // assert
    expect(container.firstElementChild).toHaveAttribute(
      "data-parity-root",
      "ListPager",
    );
  });
});
