// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { SkipLink } from "./skip-link";

afterEach(() => {
  cleanup();
});

function renderPage() {
  return render(
    <>
      <SkipLink targetId="main-content" />
      <nav aria-label="Main">
        <a href="/home">Home</a>
      </nav>
      <main id="main-content" tabIndex={-1}>
        Today
      </main>
    </>,
  );
}

describe("SkipLink", () => {
  it("is the first stop on the keyboard path", async () => {
    // arrange
    const user = userEvent.setup();
    renderPage();

    // act
    await user.tab();

    // assert
    expect(
      screen.getByRole("link", { name: "Skip to main content" }),
    ).toHaveFocus();
  });

  it("points at the main content it is given", () => {
    // arrange, act
    renderPage();

    // assert
    expect(
      screen.getByRole("link", { name: "Skip to main content" }),
    ).toHaveAttribute("href", "#main-content");
  });

  it("stays hidden until keyboard focus reveals it", () => {
    // arrange, act
    renderPage();

    // assert
    expect(
      screen.getByRole("link", { name: "Skip to main content" }),
    ).toHaveClass("ui-skip-link");
  });

  it("takes a caller's own wording", () => {
    // arrange, act
    render(<SkipLink targetId="results">Skip to results</SkipLink>);

    // assert
    expect(
      screen.getByRole("link", { name: "Skip to results" }),
    ).toHaveAttribute("href", "#results");
  });
});
