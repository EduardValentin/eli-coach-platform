// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PhoneFrame } from "./phone-frame";

describe("PhoneFrame", () => {
  it("renders reusable phone chrome around children", () => {
    render(
      <PhoneFrame aria-label="Story preview">
        <p>Inside the phone</p>
      </PhoneFrame>,
    );

    expect(screen.getByLabelText("Story preview")).toHaveClass("ui-phone-frame");
    expect(screen.getByText("Inside the phone")).toBeInTheDocument();
  });

  it("renders decorative status chrome hidden from assistive tech", () => {
    const { container } = render(
      <PhoneFrame statusBarVariant="light" time="10:08">
        <p>Screen</p>
      </PhoneFrame>,
    );

    expect(container.querySelector(".ui-phone-frame__notch")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(container.querySelector(".ui-phone-frame__status-bar")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByText("10:08")).toBeInTheDocument();
  });
});
