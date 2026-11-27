// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  it("points its trigger at no menu while closed", () => {
    // arrange, act
    renderResourceActions();

    // assert
    expect(
      screen.getByRole("button", { name: "Actions for Meal plan" }),
    ).not.toHaveAttribute("aria-controls");
  });

  it("points its trigger at its menu while open", async () => {
    // arrange
    const user = userEvent.setup();
    renderResourceActions();
    const trigger = screen.getByRole("button", {
      name: "Actions for Meal plan",
    });

    // act
    await user.click(trigger);

    // assert
    expect(trigger).toHaveAttribute(
      "aria-controls",
      screen.getByRole("menu").id,
    );
  });

  it("gives every item the 48px pointer target", async () => {
    // arrange
    const user = userEvent.setup();
    renderResourceActions();

    // act
    await user.click(
      screen.getByRole("button", { name: "Actions for Meal plan" }),
    );

    // assert
    for (const item of screen.getAllByRole("menuitem")) {
      expect(item).toHaveClass("min-h-12");
    }
  });

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

  it("draws every item's focus ring inside its own box, without a halo, so a keyboard user sees which item Enter acts on", async () => {
    // arrange
    const user = userEvent.setup();
    renderResourceActions();

    // act
    await user.click(
      screen.getByRole("button", { name: "Actions for Meal plan" }),
    );

    // assert
    for (const item of screen.getAllByRole("menuitem")) {
      expect(item).toHaveAttribute("data-focus-ring");
      expect(item).toHaveClass(
        "[--focus-ring-offset:-2px]",
        "[--focus-ring-halo:0_0_#0000]",
      );
    }
  });

  function renderMenuWithSubmenu() {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Actions for Day</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Copy day to</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Tuesday</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
  }

  it("draws a submenu trigger's focus ring inside its own box, without a halo", async () => {
    // arrange
    const user = userEvent.setup();
    renderMenuWithSubmenu();

    // act
    await user.click(screen.getByRole("button", { name: "Actions for Day" }));

    // assert
    const trigger = screen.getByRole("menuitem", { name: "Copy day to" });
    expect(trigger).toHaveAttribute("data-focus-ring");
    expect(trigger).toHaveClass(
      "[--focus-ring-offset:-2px]",
      "[--focus-ring-halo:0_0_#0000]",
    );
  });

  it("holds a submenu trigger's fill only while its submenu is open, so the fill never outlives the focus", async () => {
    // arrange
    const user = userEvent.setup();
    renderMenuWithSubmenu();

    // act
    await user.click(screen.getByRole("button", { name: "Actions for Day" }));

    // assert
    const trigger = screen.getByRole("menuitem", { name: "Copy day to" });
    expect(trigger).toHaveClass(
      "focus:bg-primary-soft",
      "data-[state=open]:bg-primary-soft",
    );
    expect(trigger).not.toHaveClass("bg-primary-soft");
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
