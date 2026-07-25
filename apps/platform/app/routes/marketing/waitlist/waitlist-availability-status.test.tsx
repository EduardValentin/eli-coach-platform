// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WaitlistAvailabilityStatus } from "./waitlist-availability-status";

afterEach(() => {
  cleanup();
});

describe("WaitlistAvailabilityStatus", () => {
  it.each([
    ["available", "Reduced-price spots available"],
    ["limited", "Limited spots"],
    ["closed", "Reduced-price spots closed"],
  ] as const)("renders %s availability", (availability, label) => {
    // arrange
    render(<WaitlistAvailabilityStatus availability={availability} variant="dark" />);

    // act
    const status = screen.getByRole("status");

    // assert
    expect(status).toHaveTextContent(label);
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
