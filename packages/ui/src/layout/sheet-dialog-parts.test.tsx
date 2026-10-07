// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  SheetDialogActions,
  SheetDialogBody,
  SheetDialogHeader,
} from "./sheet-dialog-parts";

afterEach(() => {
  cleanup();
});

describe("SheetDialogHeader", () => {
  it("heads the sheet with its visible title and description above a rule", () => {
    // arrange
    // act
    render(
      <SheetDialogHeader
        description="Same time of day, same tape."
        title="Add measurements"
      />,
    );

    // assert
    const title = screen.getByRole("heading", {
      level: 3,
      name: "Add measurements",
    });
    const description = screen.getByText("Same time of day, same tape.");
    expect(title).toHaveClass(
      "pr-10",
      "text-lg",
      "leading-snug",
      "font-semibold",
      "text-text-primary",
      "md:text-xl",
    );
    expect(description).toHaveClass(
      "mt-1",
      "text-xs",
      "text-text-secondary",
      "sm:text-sm",
    );
    expect(title.parentElement).toHaveClass(
      "shrink-0",
      "border-b",
      "border-border-subtle",
      "px-5",
      "pt-6",
      "pb-4",
      "md:px-8",
      "md:pt-8",
    );
  });

  it("leaves the description out when there is none", () => {
    // arrange
    // act
    render(<SheetDialogHeader title="Add resource" />);

    // assert
    expect(
      screen.getByRole("heading", { name: "Add resource" }).parentElement
        ?.children,
    ).toHaveLength(1);
  });
});

describe("SheetDialogBody", () => {
  it("scrolls its content under the fixed header", () => {
    // arrange
    // act
    render(
      <SheetDialogBody>
        <p>Fields</p>
      </SheetDialogBody>,
    );

    // assert
    expect(screen.getByText("Fields").parentElement).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-y-auto",
      "px-5",
      "pt-5",
      "pb-6",
      "md:px-8",
      "md:pt-6",
      "md:pb-8",
    );
  });
});

describe("SheetDialogActions", () => {
  it("puts the first action last: below the others on phones, to their right on wider screens", () => {
    // arrange
    // act
    render(
      <SheetDialogActions>
        <button type="submit">Save</button>
        <button type="button">Cancel</button>
      </SheetDialogActions>,
    );

    // assert
    expect(
      screen.getByRole("button", { name: "Save" }).parentElement,
    ).toHaveClass("flex", "flex-col-reverse", "gap-3", "sm:flex-row-reverse");
  });
});
