// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WaitlistAvailabilityStatus } from "./waitlist-availability-status";

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
    expect(status).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("renders no status or exact-count progress when availability is unavailable", () => {
    // arrange
    const { container } = render(
      <WaitlistAvailabilityStatus availability={null} variant="light" />,
    );

    // act
    const status = screen.queryByRole("status");
    const progress = screen.queryByRole("progressbar");

    // assert
    expect(status).not.toBeInTheDocument();
    expect(progress).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
