// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Dialog, DialogContent } from "./dialog";

afterEach(() => {
  cleanup();
});

function ReviewAnswers(props: { size?: "compact" | "wide" }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Review answers
      </button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent
          description="Tick any answer you want her to revisit."
          footer={
            <button onClick={() => setOpen(false)} type="button">
              Approve answers
            </button>
          }
          size={props.size}
          title="Review Ana's answers"
        >
          <label>
            Sleep
            <input type="checkbox" />
          </label>
        </DialogContent>
      </Dialog>
    </>
  );
}

async function openReview(options?: { size?: "compact" | "wide" }) {
  const user = userEvent.setup();
  render(<ReviewAnswers size={options?.size} />);

  await user.click(screen.getByRole("button", { name: "Review answers" }));

  return { user };
}

describe("DialogContent", () => {
  it("opens as a titled, described modal dialog", async () => {
    // arrange, act
    await openReview();

    // assert
    expect(
      screen.getByRole("dialog", {
        description: "Tick any answer you want her to revisit.",
        name: "Review Ana's answers",
      }),
    ).toBeInTheDocument();
  });

  it("carries its body and its footer", async () => {
    // arrange, act
    await openReview();

    // assert
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("checkbox", { name: "Sleep" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Approve answers" }),
    ).toBeInTheDocument();
  });

  it("keeps focus inside while it is open", async () => {
    // arrange
    const { user } = await openReview();
    const dialog = screen.getByRole("dialog");

    // act
    for (let step = 0; step < 4; step += 1) {
      await user.tab();
    }

    // assert
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("walks focus back round from its last control to its first", async () => {
    // arrange
    const { user } = await openReview();
    screen.getByRole("button", { name: "Close" }).focus();

    // act
    await user.tab();

    // assert
    expect(screen.getByRole("checkbox", { name: "Sleep" })).toHaveFocus();
  });

  it("hands focus back to its opener when Escape closes it", async () => {
    // arrange
    const { user } = await openReview();

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Review answers" }),
    ).toHaveFocus();
  });

  it("hands focus back to its opener when its close button closes it", async () => {
    // arrange
    const { user } = await openReview();

    // act
    await user.click(screen.getByRole("button", { name: "Close" }));

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Review answers" }),
    ).toHaveFocus();
  });

  it("hands focus back to its opener when a footer action closes it", async () => {
    // arrange
    const { user } = await openReview();

    // act
    await user.click(screen.getByRole("button", { name: "Approve answers" }));

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Review answers" }),
    ).toHaveFocus();
  });

  it("scrolls a wide dialog's body between its fixed header and footer", async () => {
    // arrange, act
    await openReview({ size: "wide" });

    // assert
    expect(screen.getByRole("dialog")).toHaveClass(
      "flex",
      "flex-col",
      "overflow-hidden",
      "sm:max-w-3xl",
    );
    expect(
      screen.getByRole("checkbox", { name: "Sleep" }).closest("label")
        ?.parentElement,
    ).toHaveClass("min-h-0", "flex-1", "overflow-y-auto");
  });

  it("scrolls a compact dialog as a whole", async () => {
    // arrange, act
    await openReview();

    // assert
    expect(screen.getByRole("dialog")).toHaveClass(
      "grid",
      "overflow-y-auto",
      "sm:max-w-md",
    );
  });
});
