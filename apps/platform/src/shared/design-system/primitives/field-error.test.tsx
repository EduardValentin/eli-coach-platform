// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FieldError } from "./field-error";

afterEach(() => {
  cleanup();
});

describe("FieldError", () => {
  it("describes the field it names with its message", () => {
    // arrange
    const message = "Enter your email.";

    // act
    render(
      <>
        <input aria-describedby="email-error" aria-label="Email" />
        <FieldError id="email-error" message={message} />
      </>,
    );

    // assert
    expect(
      screen.getByRole("textbox", { name: "Email" }),
    ).toHaveAccessibleDescription("Enter your email.");
  });

  it("leads with an alert icon hidden from assistive technology", () => {
    // arrange
    const message = "Enter your email.";

    // act
    render(<FieldError id="email-error" message={message} />);

    // assert
    const alert = screen.getByRole("alert");
    const icon = alert.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveClass("mt-0.5", "shrink-0");
    expect(alert.firstElementChild).toBe(icon);
    expect(alert).toHaveTextContent(message);
  });

  it("lays the icon and message out as a danger row", () => {
    // arrange
    const message = "Enter your email.";

    // act
    render(<FieldError id="email-error" message={message} />);

    // assert
    expect(screen.getByRole("alert")).toHaveClass(
      "flex",
      "items-start",
      "gap-1.5",
      "text-sm",
      "leading-snug",
      "font-medium",
      "text-feedback-danger",
    );
  });

  it("renders nothing while the field has no problem", () => {
    // arrange
    const message = undefined;

    // act
    const { container } = render(
      <FieldError id="email-error" message={message} />,
    );

    // assert
    expect(container).toBeEmptyDOMElement();
  });

  it("announces its message as an alert", () => {
    // arrange
    const message = "Tick the box to carry on.";

    // act
    render(<FieldError id="consent-error" message={message} />);

    // assert
    expect(screen.getByRole("alert")).toHaveTextContent(message);
  });
});
