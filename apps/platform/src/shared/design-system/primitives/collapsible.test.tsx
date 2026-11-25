// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible";

afterEach(() => {
  cleanup();
});

function renderDetails() {
  return render(
    <Collapsible>
      <CollapsibleTrigger>Details</CollapsibleTrigger>
      <CollapsibleContent>Warm-up sets</CollapsibleContent>
    </Collapsible>,
  );
}

describe("Collapsible", () => {
  it("keeps its content hidden and its trigger collapsed until opened", () => {
    // arrange
    // act
    renderDetails();

    // assert
    expect(screen.getByRole("button", { name: "Details" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByText("Warm-up sets")).not.toBeInTheDocument();
  });

  it("opens its content and marks the trigger expanded when the trigger is pressed", async () => {
    // arrange
    const user = userEvent.setup();
    renderDetails();
    const trigger = screen.getByRole("button", { name: "Details" });

    // act
    await user.click(trigger);

    // assert
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Warm-up sets")).toBeVisible();
  });

  it("closes again when the trigger is pressed a second time", async () => {
    // arrange
    const user = userEvent.setup();
    renderDetails();
    const trigger = screen.getByRole("button", { name: "Details" });
    await user.click(trigger);

    // act
    await user.click(trigger);

    // assert
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Warm-up sets")).not.toBeInTheDocument();
  });

  it("opens from the keyboard", async () => {
    // arrange
    const user = userEvent.setup();
    renderDetails();
    await user.tab();

    // act
    await user.keyboard("{Enter}");

    // assert
    expect(screen.getByText("Warm-up sets")).toBeVisible();
  });

  it("points its trigger at its content only while open", async () => {
    // arrange
    const user = userEvent.setup();
    renderDetails();
    const trigger = screen.getByRole("button", { name: "Details" });
    expect(trigger).not.toHaveAttribute("aria-controls");

    // act
    await user.click(trigger);

    // assert
    expect(trigger).toHaveAttribute(
      "aria-controls",
      screen.getByText("Warm-up sets").id,
    );
  });

  it("reports each change to a controlling caller", async () => {
    // arrange
    const user = userEvent.setup();
    const changes: boolean[] = [];
    render(
      <Collapsible onOpenChange={(open) => changes.push(open)}>
        <CollapsibleTrigger>Details</CollapsibleTrigger>
        <CollapsibleContent>Warm-up sets</CollapsibleContent>
      </Collapsible>,
    );

    // act
    await user.click(screen.getByRole("button", { name: "Details" }));

    // assert
    expect(changes).toEqual([true]);
  });
});
