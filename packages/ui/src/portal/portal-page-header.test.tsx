// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PortalPageHeader } from "./portal-page-header";

afterEach(() => {
  cleanup();
});

describe("PortalPageHeader", () => {
  it("renders the title as the page's one heading", () => {
    // arrange
    // act
    render(<PortalPageHeader title="Assessment calls" />);

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Assessment calls" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });

  it("reads the subtitle under the title when given", () => {
    // arrange
    // act
    render(
      <PortalPageHeader
        title="Assessment calls"
        subtitle="Everyone who booked a call with you."
      />,
    );

    // assert
    expect(
      screen.getByText("Everyone who booked a call with you."),
    ).toHaveClass("text-text-secondary");
  });

  it("renders no subtitle paragraph without one", () => {
    // arrange
    // act
    render(<PortalPageHeader title="Settings" />);

    // assert
    expect(screen.getByRole("banner").querySelector("p")).toBeNull();
  });

  it("places the actions beside the title", () => {
    // arrange
    // act
    render(
      <PortalPageHeader
        title="Settings"
        actions={<button type="button">Save</button>}
      />,
    );

    // assert
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
