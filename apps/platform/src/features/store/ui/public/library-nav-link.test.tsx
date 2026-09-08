// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";

import { LibraryNavLink } from "./library-nav-link";

afterEach(() => {
  cleanup();
});

describe("library nav link", () => {
  it.each(["header", "mobile-menu"] as const)(
    "points the %s placement at the Library",
    (placement) => {
      // arrange
      render(
        <MemoryRouter>
          <LibraryNavLink placement={placement} />
        </MemoryRouter>,
      );

      // act
      const link = screen.getByRole("link", { name: "Library" });

      // assert
      expect(link).toHaveAttribute("href", "/library");
    },
  );

  it("keeps the Library reachable under a deployment base path", () => {
    // arrange
    render(
      <MemoryRouter basename="/evoa" initialEntries={["/evoa/store"]}>
        <LibraryNavLink placement="header" />
      </MemoryRouter>,
    );

    // act
    const link = screen.getByRole("link", { name: "Library" });

    // assert
    expect(link).toHaveAttribute("href", "/evoa/library");
  });
});
