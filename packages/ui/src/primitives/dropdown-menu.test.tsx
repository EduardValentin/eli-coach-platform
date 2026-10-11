// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

afterEach(() => {
  cleanup();
});

function renderResourceActions() {
  return render(
    <DropdownMenu>
      <DropdownMenuTrigger>Actions for Meal plan</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Edit details</DropdownMenuItem>
        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
}

describe("DropdownMenu", () => {
  it("opens its menu when the trigger is clicked", async () => {
    // arrange
    const user = userEvent.setup();
    renderResourceActions();

    // act
    await user.click(
      screen.getByRole("button", { name: "Actions for Meal plan" }),
    );

    // assert
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("offers each item as a menu item", async () => {
    // arrange
    const user = userEvent.setup();
    renderResourceActions();

    // act
    await user.click(
      screen.getByRole("button", { name: "Actions for Meal plan" }),
    );

    // assert
    expect(
      screen.getAllByRole("menuitem").map((item) => item.textContent),
    ).toEqual(["Edit details", "Delete"]);
  });

  it("marks a destructive item apart from a default one", async () => {
    // arrange
    const user = userEvent.setup();
    renderResourceActions();

    // act
    await user.click(
      screen.getByRole("button", { name: "Actions for Meal plan" }),
    );

    // assert
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute(
      "data-variant",
      "destructive",
    );
    expect(
      screen.getByRole("menuitem", { name: "Edit details" }),
    ).toHaveAttribute("data-variant", "default");
  });

  it("dims an item marked aria-disabled and shows it cannot be chosen", async () => {
    // arrange
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Actions for Meal plan</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem aria-disabled>Reschedule</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    // act
    await user.click(
      screen.getByRole("button", { name: "Actions for Meal plan" }),
    );

    // assert
    expect(screen.getByRole("menuitem", { name: "Reschedule" })).toHaveClass(
      "aria-disabled:cursor-not-allowed",
      "aria-disabled:opacity-50",
    );
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    // arrange
    const user = userEvent.setup();
    renderResourceActions();
    const trigger = screen.getByRole("button", {
      name: "Actions for Meal plan",
    });
    await user.click(trigger);

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
