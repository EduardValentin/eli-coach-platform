// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SectionEyebrow } from "./section-eyebrow";

afterEach(() => {
  cleanup();
});

describe("SectionEyebrow", () => {
  it("renders the brand landing-section eyebrow style by default", () => {
    render(<SectionEyebrow>Your fitness, in one app</SectionEyebrow>);

    expect(screen.getByText("Your fitness, in one app")).toHaveClass(
      "text-brand-primary",
      "tracking-section-eyebrow",
      "uppercase",
    );
  });

  it("renders the muted section-intro eyebrow style", () => {
    render(<SectionEyebrow variant="muted">What you get</SectionEyebrow>);

    expect(screen.getByText("What you get")).toHaveClass(
      "text-text-muted",
      "text-body-sm",
      "mb-6",
    );
  });
});
