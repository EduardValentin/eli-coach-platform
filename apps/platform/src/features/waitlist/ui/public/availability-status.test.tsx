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
    render(
      <WaitlistAvailabilityStatus
        availability="available"
        presentationState="ready"
        variant="dark"
      />,
    );

    // act
    const status = screen.getByRole("status");

    // assert
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(status).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("renders no status or exact-count progress while availability is loading", () => {
    // arrange
    const { container } = render(
      <WaitlistAvailabilityStatus
        availability={null}
        presentationState="loading"
        variant="light"
      />,
    );

    // act
    const status = screen.queryByRole("status");
    const progress = screen.queryByRole("progressbar");

    // assert
    expect(status).not.toBeInTheDocument();
    expect(progress).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("exposes an error without exact-count progress when availability is unavailable", () => {
    // arrange
    render(
      <WaitlistAvailabilityStatus
        availability={null}
        presentationState="unavailable"
        variant="light"
      />,
    );

    // act
    const alert = screen.getByRole("alert");
    const progress = screen.queryByRole("progressbar");

    // assert
    expect(alert).toBeInTheDocument();
    expect(progress).not.toBeInTheDocument();
  });
});
