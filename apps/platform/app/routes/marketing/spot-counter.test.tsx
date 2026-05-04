// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SpotCounter } from "./spot-counter";

afterEach(() => {
  cleanup();
});

describe("SpotCounter", () => {
  it("uses neutral copy while spots remain", () => {
    render(<SpotCounter cap={10} spotsRemaining={1} variant="dark" />);

    expect(screen.getByText("1 of 10 spots remaining")).toBeInTheDocument();
    expect(screen.queryByText("Only 1 spots left")).not.toBeInTheDocument();
  });

  it("shows the sold out copy when no spots remain", () => {
    render(<SpotCounter cap={10} spotsRemaining={0} variant="dark" />);

    expect(screen.getByText("All spots have been claimed")).toBeInTheDocument();
  });
});
