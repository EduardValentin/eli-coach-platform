import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const INSET_RING = [
  "[--focus-ring-offset:-2px]",
  "[--focus-ring-halo:0_0_#0000]",
];

async function openMenu() {
  const user = userEvent.setup();
  render(
    <DropdownMenu>
      <DropdownMenuTrigger>Open</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        <DropdownMenuCheckboxItem checked>Show notes</DropdownMenuCheckboxItem>
        <DropdownMenuRadioGroup value="week">
          <DropdownMenuRadioItem value="week">Week</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Block one</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  await user.click(screen.getByRole("button", { name: "Open" }));
}

describe("dropdown menu items", () => {
  it.each([
    ["a plain item", "menuitem", "Edit"],
    ["a destructive item", "menuitem", "Delete"],
    ["a checkbox item", "menuitemcheckbox", "Show notes"],
    ["a radio item", "menuitemradio", "Week"],
    ["a submenu trigger", "menuitem", "Move to"],
  ] as const)("draws %s's focus ring inside its own box, without a halo", async (_name, role, label) => {
    // arrange
    await openMenu();

    // act
    const item = screen.getByRole(role, { name: label });

    // assert
    expect(item).toHaveAttribute("data-focus-ring");
    expect(item).toHaveClass(...INSET_RING);
  });

  it("holds a submenu trigger's fill only while its submenu is open, so the fill never outlives the focus", async () => {
    // arrange
    await openMenu();

    // act
    const trigger = screen.getByRole("menuitem", { name: "Move to" });

    // assert
    expect(trigger).toHaveClass("data-[state=open]:bg-accent", "focus:bg-accent");
    expect(trigger).not.toHaveClass("bg-accent");
  });
});
