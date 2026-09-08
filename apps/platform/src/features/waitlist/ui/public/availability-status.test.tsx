// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WaitlistAvailabilityStatus } from "./availability-status";

afterEach(() => {
  cleanup();
});

describe("WaitlistAvailabilityStatus", () => {
  it("exposes one live status when availability is known", () => {
    // arrange
    render(<WaitlistAvailabilityStatus availability="available" variant="dark" />);

    // act
    const status = screen.getByRole("status");

    // assert
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(status).toHaveTextContent("Reduced-price spots available");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("exposes an error without exact-count progress when availability is unavailable", () => {
    // arrange
    render(<WaitlistAvailabilityStatus availability={null} variant="light" />);

    // act
    const alert = screen.getByRole("alert");

    // assert
    expect(alert).toHaveTextContent("couldn't load waitlist availability");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
