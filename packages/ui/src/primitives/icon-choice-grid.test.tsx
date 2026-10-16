// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Apple, Fish, Utensils } from "lucide-react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IconChoiceGrid } from "./icon-choice-grid";

type Choice = "apple" | "fish" | "other";

const OPTIONS = [
  { key: "apple", label: "Fruit", icon: Apple },
  { key: "fish", label: "Fish", icon: Fish },
  { key: "other", label: "Other", icon: Utensils },
] as const;

afterEach(() => {
  cleanup();
});

function ChosenIcon({ initial }: { initial: Choice }) {
  const [value, setValue] = useState<Choice>(initial);

  return (
    <>
      <p id="icon-label">Icon</p>
      <IconChoiceGrid
        aria-labelledby="icon-label"
        onChange={setValue}
        options={OPTIONS}
        value={value}
      />
    </>
  );
}

describe("IconChoiceGrid", () => {
  it("lists every choice as a button named by its label, inside a list named by its label", () => {
    // arrange, act
    render(<ChosenIcon initial="other" />);

    // assert
    expect(screen.getByRole("list", { name: "Icon" })).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Fruit", "Fish", "Other"]);
  });

  it("presses only the chosen icon", () => {
    // arrange, act
    render(<ChosenIcon initial="fish" />);

    // assert
    expect(screen.getByRole("button", { name: "Fish" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Fruit" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("chooses an icon on click", async () => {
    // arrange
    const user = userEvent.setup();
    render(<ChosenIcon initial="other" />);

    // act
    await user.click(screen.getByRole("button", { name: "Fruit" }));

    // assert
    expect(screen.getByRole("button", { name: "Fruit" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Other" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("chooses an icon from the keyboard", async () => {
    // arrange
    const user = userEvent.setup();
    render(<ChosenIcon initial="other" />);

    // act
    await user.tab();
    await user.tab();
    await user.keyboard("{Enter}");

    // assert
    expect(screen.getByRole("button", { name: "Fish" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Fish" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("answers the key of the chosen icon", async () => {
    // arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <IconChoiceGrid
        aria-labelledby="icon-label"
        onChange={onChange}
        options={OPTIONS}
        value="other"
      />,
    );

    // act
    await user.click(screen.getByRole("button", { name: "Fish" }));

    // assert
    expect(onChange).toHaveBeenCalledWith("fish");
  });

  it("marks the chosen icon with the primary tint and the others with the quiet border", () => {
    // arrange, act
    render(<ChosenIcon initial="apple" />);

    // assert
    expect(screen.getByRole("button", { name: "Fruit" })).toHaveClass(
      "border-primary",
      "bg-primary-soft",
      "text-primary",
    );
    expect(screen.getByRole("button", { name: "Fish" })).toHaveClass(
      "border-border-default",
      "text-text-secondary",
    );
  });
});
