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
    expect(screen.getByText("Enter your email.")).toHaveClass(
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

  it("announces its message when it is given the alert role", () => {
    // arrange
    const message = "Tick the box to carry on.";

    // act
    render(<FieldError id="consent-error" message={message} role="alert" />);

    // assert
    expect(screen.getByRole("alert")).toHaveTextContent(message);
  });
});
