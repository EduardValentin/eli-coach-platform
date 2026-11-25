// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./sheet";

afterEach(() => {
  cleanup();
});

function SectionDrawer(props: { side?: "left" | "right" }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Sections
      </button>
      <Sheet onOpenChange={setOpen} open={open}>
        <SheetContent side={props.side}>
          <SheetTitle>Program sections</SheetTitle>
          <SheetDescription>Jump to a block of the plan.</SheetDescription>
        </SheetContent>
      </Sheet>
    </>
  );
}

async function openSections(side?: "left" | "right") {
  const user = userEvent.setup();
  render(<SectionDrawer side={side} />);

  await user.click(screen.getByRole("button", { name: "Sections" }));

  return { user };
}

describe("SheetContent", () => {
  it("opens from the left with its title and description", async () => {
    // arrange, act
    await openSections("left");

    // assert
    const drawer = screen.getByRole("dialog", {
      description: "Jump to a block of the plan.",
      name: "Program sections",
    });
    expect(drawer).toHaveClass("left-0", "-translate-x-full");
    expect(drawer).not.toHaveClass("right-0", "sm:right-0");
  });

  it("opens from the right by default", async () => {
    // arrange, act
    await openSections();

    // assert
    expect(screen.getByRole("dialog")).toHaveClass(
      "translate-x-full",
      "sm:right-0",
      "sm:max-w-lg",
    );
  });

  it("offers a close control on the left", async () => {
    // arrange, act
    await openSections("left");

    // assert
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("slides without motion under reduced motion", async () => {
    // arrange, act
    await openSections("left");

    // assert
    expect(screen.getByRole("dialog")).toHaveClass(
      "motion-safe:transition-transform",
      "motion-reduce:transition-none",
    );
  });

  it("closes on Escape and hands focus back to its opener", async () => {
    // arrange
    const { user } = await openSections("left");

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sections" })).toHaveFocus();
  });
});
