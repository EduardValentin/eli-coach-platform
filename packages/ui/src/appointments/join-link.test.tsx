// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { JoinLink } from "./join-link";

afterEach(() => {
  cleanup();
});

const JOIN_PATH = "/client/checkins/c-1/join";

describe("join link", () => {
  it("leads to the join path under its label", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <JoinLink label="Join Meet" to={JOIN_PATH} tone="quiet" />
      </MemoryRouter>,
    );

    // assert
    expect(screen.getByRole("link", { name: "Join Meet" })).toHaveAttribute(
      "href",
      JOIN_PATH,
    );
  });

  it("hands the click to the browser so the join page loads as a whole document", async () => {
    // arrange
    const user = userEvent.setup();
    let isLeftToBrowser = false;
    window.addEventListener(
      "click",
      (event) => {
        isLeftToBrowser = !event.defaultPrevented;
        event.preventDefault();
      },
      { once: true },
    );
    render(
      <MemoryRouter initialEntries={["/client/checkins"]}>
        <Routes>
          <Route
            element={<JoinLink label="Join Meet" to={JOIN_PATH} tone="quiet" />}
            path="/client/checkins"
          />
          <Route element={<p>Joined inside the app</p>} path={JOIN_PATH} />
        </Routes>
      </MemoryRouter>,
    );

    // act
    await user.click(screen.getByRole("link", { name: "Join Meet" }));

    // assert
    expect(isLeftToBrowser).toBe(true);
    expect(screen.queryByText("Joined inside the app")).toBeNull();
  });

  it("stays an outline action in its quiet tone", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <JoinLink label="Join Meet" to={JOIN_PATH} tone="quiet" />
      </MemoryRouter>,
    );

    // assert
    const link = screen.getByRole("link", { name: "Join Meet" });
    expect(link).toHaveClass("border", "bg-surface-base");
    expect(link).not.toHaveClass("bg-primary");
  });

  it("fills with the portal interaction colour in its primary tone", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <JoinLink label="Join Meet" to={JOIN_PATH} tone="primary" />
      </MemoryRouter>,
    );

    // assert
    expect(screen.getByRole("link", { name: "Join Meet" })).toHaveClass(
      "bg-primary",
      "text-primary-foreground",
    );
  });

  it("takes the small action height unless a row asks for the compact one", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <JoinLink label="Join Meet" to={JOIN_PATH} tone="quiet" />
        <JoinLink label="Join row" size="xs" to={JOIN_PATH} tone="quiet" />
      </MemoryRouter>,
    );

    // assert
    expect(screen.getByRole("link", { name: "Join Meet" })).toHaveClass(
      "h-(--size-control-sm)",
    );
    expect(screen.getByRole("link", { name: "Join row" })).toHaveClass(
      "h-(--size-control-xs)",
    );
  });

  it("keeps its video glyph away from assistive technology", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <JoinLink label="Join Meet" to={JOIN_PATH} tone="quiet" />
      </MemoryRouter>,
    );

    // assert
    const glyph = screen
      .getByRole("link", { name: "Join Meet" })
      .querySelector("svg");
    expect(glyph).toHaveAttribute("aria-hidden", "true");
  });
});
