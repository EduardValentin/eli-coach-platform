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

function renderMenuOfEveryItemKind() {
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
    const user = userEvent.setup();
    renderMenuOfEveryItemKind();

    // act
    await user.click(screen.getByRole("button", { name: "Open" }));

    // assert
    const item = screen.getByRole(role, { name: label });
    expect(item).toHaveAttribute("data-focus-ring");
    expect(item).toHaveClass(...INSET_RING);
  });

  it("holds a submenu trigger's fill only while its submenu is open, so the fill never outlives the focus", async () => {
    // arrange
    const user = userEvent.setup();
    renderMenuOfEveryItemKind();

    // act
    await user.click(screen.getByRole("button", { name: "Open" }));

    // assert
    const trigger = screen.getByRole("menuitem", { name: "Move to" });
    expect(trigger).toHaveClass("data-[state=open]:bg-accent", "focus:bg-accent");
    expect(trigger).not.toHaveClass("bg-accent");
  });
});
