// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { configureAxe } from "vitest-axe";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

afterEach(() => {
  cleanup();
});

describe("Dialog", () => {
  it("supports keyboard dismissal and restores focus to its trigger", async () => {
    // arrange
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open resources</DialogTrigger>
        <DialogContent>
          <DialogTitle>Your resources</DialogTitle>
          <DialogDescription>Review your selected resources.</DialogDescription>
          <button type="button">Continue</button>
        </DialogContent>
      </Dialog>,
    );
    const trigger = screen.getByRole("button", { name: "Open resources" });

    // act
    await user.click(trigger);
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("declares itself modal for assistive technology", async () => {
    // arrange
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open resources</DialogTrigger>
        <DialogContent>
          <DialogTitle>Your resources</DialogTitle>
          <DialogDescription>Review your selected resources.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    // act
    await user.click(screen.getByRole("button", { name: "Open resources" }));

    // assert
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("has no obvious axe violations when open", async () => {
    // arrange
    const user = userEvent.setup();
    const { baseElement } = render(
      <Dialog>
        <DialogTrigger>Open resources</DialogTrigger>
        <DialogContent>
          <DialogTitle>Your resources</DialogTitle>
          <DialogDescription>Review your selected resources.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    // act
    await user.click(
      screen.getByRole("button", { name: "Open resources" }),
    );
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});
