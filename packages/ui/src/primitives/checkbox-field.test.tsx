// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CheckboxField } from "./checkbox-field";

const STATEMENT = "I agree to share progress photos with my coach.";

afterEach(() => {
  cleanup();
});

describe("CheckboxField", () => {
  it("names its checkbox with the statement beside it", () => {
    // arrange
    const onCheckedChange = vi.fn();

    // act
    render(
      <CheckboxField
        checked={false}
        label={STATEMENT}
        onCheckedChange={onCheckedChange}
      />,
    );

    // assert
    expect(screen.getByRole("checkbox", { name: STATEMENT })).not.toBeChecked();
  });

  it("reports the new state when she ticks the statement", async () => {
    // arrange
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <CheckboxField
        checked={false}
        label={STATEMENT}
        onCheckedChange={onCheckedChange}
      />,
    );

    // act
    await user.click(screen.getByText(STATEMENT));

    // assert
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("describes the checkbox with its problem and marks it invalid", () => {
    // arrange
    const error = "Tick the box to carry on.";

    // act
    render(
      <CheckboxField
        checked={false}
        error={error}
        errorRole="alert"
        label={STATEMENT}
        onCheckedChange={vi.fn()}
      />,
    );

    // assert
    const checkbox = screen.getByRole("checkbox", { name: STATEMENT });
    expect(checkbox).toHaveAccessibleDescription(error);
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(error);
  });

  it("shows what it is given between the statement and its problem", () => {
    // arrange
    const error = "Tick the box to carry on.";

    // act
    render(
      <CheckboxField
        checked={false}
        error={error}
        label={STATEMENT}
        onCheckedChange={vi.fn()}
      >
        <a href="/privacy">How I handle your data →</a>
      </CheckboxField>,
    );

    // assert
    const link = screen.getByRole("link", { name: "How I handle your data →" });
    expect(
      screen.getByText(STATEMENT).compareDocumentPosition(link) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      link.compareDocumentPosition(screen.getByText(error)) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("sets a statement in an inset frame, the box aligned to its first line", () => {
    // arrange
    const props = {
      checked: true,
      frame: "inset",
      label: STATEMENT,
      layout: "statement",
      onCheckedChange: vi.fn(),
    } as const;

    // act
    render(<CheckboxField {...props} />);

    // assert
    const statement = screen.getByText(STATEMENT);
    expect(statement).toHaveClass("text-sm", "leading-relaxed");
    expect(statement.parentElement).toHaveClass(
      "flex",
      "items-start",
      "gap-3",
      "rounded-card",
      "bg-surface-quiet/60",
      "p-4",
    );
    expect(screen.getByRole("checkbox")).toHaveClass("mt-0.5");
  });

  it("sets a short option inline, centred on its box", () => {
    // arrange
    const props = {
      checked: false,
      label: "I'm not sure",
      onCheckedChange: vi.fn(),
    };

    // act
    render(<CheckboxField {...props} />);

    // assert
    const label = screen.getByText("I'm not sure");
    expect(label).not.toHaveClass("leading-relaxed");
    expect(label.parentElement).toHaveClass("flex", "items-center", "gap-2");
    expect(label.parentElement).not.toHaveClass("rounded-card");
  });
});
