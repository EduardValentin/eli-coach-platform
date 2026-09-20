// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";

import AssessmentCallJoinRoute from "./join-page";

afterEach(() => {
  cleanup();
});

describe("AssessmentCallJoinRoute", () => {
  it("shows the call link not ready page with a way back home", () => {
    // arrange, act
    render(
      <MemoryRouter>
        <AssessmentCallJoinRoute />
      </MemoryRouter>,
    );

    // assert
    const main = screen.getByRole("main", { name: "Assessment call" });

    expect(
      screen.getByRole("heading", { name: "Your call link isn't ready yet" }),
    ).toBeInTheDocument();
    expect(main).toHaveTextContent(
      "The meeting room for this call hasn't been set up yet.",
    );

    const backLink = screen.getByRole("link", { name: "Back to home" });

    expect(backLink).toHaveAttribute("href", "/");
  });
});
