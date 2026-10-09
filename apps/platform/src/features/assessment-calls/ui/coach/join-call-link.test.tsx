// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { JoinCallLink } from "~/features/assessment-calls/ui/coach/join-call-link";

afterEach(() => {
  cleanup();
});

const JOIN_PATH = "/book/b-1/join";

describe("join call link", () => {
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
      <MemoryRouter initialEntries={["/coach/calls"]}>
        <Routes>
          <Route
            element={<JoinCallLink joinPath={JOIN_PATH} tone="default" />}
            path="/coach/calls"
          />
          <Route element={<p>Joined inside the app</p>} path={JOIN_PATH} />
        </Routes>
      </MemoryRouter>,
    );

    // act
    await user.click(screen.getByRole("link", { name: "Join call" }));

    // assert
    expect(isLeftToBrowser).toBe(true);
    expect(screen.queryByText("Joined inside the app")).toBeNull();
  });
});
