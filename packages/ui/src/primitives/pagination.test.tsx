// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import {
  Pagination,
  PaginationCurrentPage,
  PaginationEllipsis,
  PaginationLink,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

afterEach(() => {
  cleanup();
});

function renderPagination(steps: {
  nextPath: string | null;
  previousPath: string | null;
}) {
  return render(
    <MemoryRouter initialEntries={["/calls?page=2"]}>
      <Pagination>
        <PaginationList>
          <PaginationPrevious to={steps.previousPath} />
          <PaginationLink page={1} to="/calls" />
          <PaginationCurrentPage page={2} to="/calls?page=2" />
          <PaginationEllipsis />
          <PaginationLink page={9} to="/calls?page=9" />
          <PaginationNext to={steps.nextPath} />
        </PaginationList>
      </Pagination>
    </MemoryRouter>,
  );
}

describe("pagination", () => {
  it("is a navigation landmark listing the pages on offer", () => {
    // arrange, act
    renderPagination({ nextPath: "/calls?page=3", previousPath: "/calls" });

    // assert
    const pages = screen.getByRole("navigation", { name: "pagination" });

    expect(
      within(pages).getByRole("link", { name: "Go to page 1" }),
    ).toHaveAttribute("href", "/calls");
    expect(within(pages).getAllByRole("listitem")).toHaveLength(5);
  });

  it("marks the page being read as the current one and outlines it", () => {
    // arrange, act
    renderPagination({ nextPath: "/calls?page=3", previousPath: "/calls" });

    // assert
    const currentPage = screen.getByRole("link", { name: "Go to page 2" });
    expect(currentPage).toHaveAttribute("aria-current", "page");
    expect(currentPage).toHaveClass(
      "border-control-border-soft",
      "bg-surface-base",
      "size-(--size-control-xs)",
      "rounded-full",
    );
  });

  it("draws the other pages as quiet round buttons", () => {
    // arrange, act
    renderPagination({ nextPath: "/calls?page=3", previousPath: "/calls" });

    // assert
    const otherPage = screen.getByRole("link", { name: "Go to page 1" });
    expect(otherPage).toHaveClass(
      "hover:bg-surface-quiet",
      "size-(--size-control-xs)",
      "rounded-full",
    );
    expect(otherPage).not.toHaveClass("border");
  });

  it("draws the steps either side as quiet text buttons with tight spacing", () => {
    // arrange, act
    renderPagination({ nextPath: "/calls?page=3", previousPath: "/calls" });

    // assert
    const previous = screen.getByRole("link", { name: "Go to previous page" });
    expect(previous).toHaveClass(
      "hover:bg-surface-quiet",
      "h-(--size-control-xs)",
      "gap-1",
      "px-2.5",
      "text-sm",
    );
    expect(previous).not.toHaveClass("rounded-full", "px-3", "gap-2");
  });

  it("offers the steps either side as links while there is somewhere to go", () => {
    // arrange, act
    renderPagination({ nextPath: "/calls?page=3", previousPath: "/calls" });

    // assert
    expect(
      screen.getByRole("link", { name: "Go to previous page" }),
    ).toHaveAttribute("href", "/calls");
    expect(
      screen.getByRole("link", { name: "Go to next page" }),
    ).toHaveAttribute("href", "/calls?page=3");
  });

  it("turns a step at the end of the run into a disabled control", () => {
    // arrange, act
    renderPagination({ nextPath: null, previousPath: null });

    // assert
    expect(
      screen.getByRole("button", { name: "Go to previous page" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Go to next page" }),
    ).toBeDisabled();
  });

  it("hides the gap between distant pages from assistive technology", () => {
    // arrange, act
    renderPagination({ nextPath: null, previousPath: null });

    // assert
    expect(
      screen.getByText("More pages").closest("[aria-hidden]"),
    ).not.toBeNull();
  });
});
