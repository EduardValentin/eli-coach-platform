// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Apple, Fish } from "lucide-react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IconChoicePopover } from "./icon-choice-popover";

type Choice = "apple" | "fish";

const OPTIONS = [
  { key: "apple", label: "Fruit", icon: Apple },
  { key: "fish", label: "Fish", icon: Fish },
] as const;

afterEach(() => {
  cleanup();
});

function ChosenIcon({ initial }: { initial: Choice | null }) {
  const [value, setValue] = useState<Choice | null>(initial);

  return (
    <IconChoicePopover
      data-parity="icon-list"
      label="Meal icons"
      noneLabel="None"
      onChange={setValue}
      options={OPTIONS}
      triggerLabel={value ? `Icon: ${value}` : "Choose icon"}
      value={value}
    />
  );
}

async function openPopover(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /icon/i }));
}

describe("IconChoicePopover", () => {
  it("shows only its trigger until opened", () => {
    // arrange, act
    render(<ChosenIcon initial={null} />);

    // assert
    expect(
      screen.getByRole("button", { name: "Choose icon" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens a listbox named by its label, with the label as a caption", async () => {
    // arrange
    const user = userEvent.setup();
    render(<ChosenIcon initial={null} />);

    // act
    await openPopover(user);

    // assert
    expect(
      screen.getByRole("listbox", { name: "Meal icons" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Meal icons", { selector: "p" }),
    ).toBeInTheDocument();
  });

  it("lists None first, then every option, each named by its visible label", async () => {
    // arrange
    const user = userEvent.setup();
    render(<ChosenIcon initial={null} />);

    // act
    await openPopover(user);

    // assert
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["None", "Fruit", "Fish"]);
    expect(screen.getByRole("option", { name: "Fruit" })).toBeInTheDocument();
  });

  it("selects only the chosen option, or None when nothing is chosen", async () => {
    // arrange
    const user = userEvent.setup();
    render(<ChosenIcon initial="fish" />);

    // act
    await openPopover(user);

    // assert
    expect(screen.getByRole("option", { name: "Fish" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("option", { name: "None" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("selects None when no icon is chosen", async () => {
    // arrange
    const user = userEvent.setup();
    render(<ChosenIcon initial={null} />);

    // act
    await openPopover(user);

    // assert
    expect(screen.getByRole("option", { name: "None" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("answers the key of the clicked option, closes and returns focus to the trigger", async () => {
    // arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <IconChoicePopover
        label="Meal icons"
        noneLabel="None"
        onChange={onChange}
        options={OPTIONS}
        triggerLabel="Choose icon"
        value={null}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Choose icon" }));

    // act
    await user.click(screen.getByRole("option", { name: "Fish" }));

    // assert
    expect(onChange).toHaveBeenCalledWith("fish");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose icon" })).toHaveFocus();
  });

  it("answers null when None is chosen", async () => {
    // arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <IconChoicePopover
        label="Meal icons"
        noneLabel="None"
        onChange={onChange}
        options={OPTIONS}
        triggerLabel="Icon: Fish"
        value="fish"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Icon: Fish" }));

    // act
    await user.click(screen.getByRole("option", { name: "None" }));

    // assert
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("chooses from the keyboard", async () => {
    // arrange
    const user = userEvent.setup();
    render(<ChosenIcon initial={null} />);

    // act
    await user.tab();
    await user.keyboard("{Enter}");
    await user.tab();
    await user.keyboard("{Enter}");

    // assert
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Icon: apple" })).toHaveFocus();
  });

  it("passes data attributes to the listbox", async () => {
    // arrange
    const user = userEvent.setup();
    render(<ChosenIcon initial={null} />);

    // act
    await openPopover(user);

    // assert
    expect(screen.getByRole("listbox")).toHaveAttribute(
      "data-parity",
      "icon-list",
    );
  });

  it("gives the chosen option the primary tint and the others the resting ink", async () => {
    // arrange
    const user = userEvent.setup();
    render(<ChosenIcon initial="apple" />);

    // act
    await openPopover(user);

    // assert
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByRole("option", { name: "Fruit" })).toHaveClass(
      "bg-primary-soft",
      "text-primary",
    );
    expect(within(listbox).getByRole("option", { name: "Fish" })).toHaveClass(
      "text-text-secondary",
      "hover:bg-surface-muted",
      "hover:text-text-primary",
    );
  });

  it("opts every option into the one focus ring instead of a ring of its own", async () => {
    // arrange
    const user = userEvent.setup();
    render(<ChosenIcon initial={null} />);

    // act
    await openPopover(user);

    // assert
    for (const option of screen.getAllByRole("option")) {
      expect(option).toHaveAttribute("data-focus-ring");
      expect(option).not.toHaveClass("focus-visible:ring-2");
    }
  });
});
