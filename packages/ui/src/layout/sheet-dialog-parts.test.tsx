// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";

import {
  SheetDialogActions,
  SheetDialogBody,
  SheetDialogFooter,
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

  it("hands its title to a caller that focuses it, reachable by script but not by Tab and without an outline", () => {
    // arrange
    const titleRef = createRef<HTMLHeadingElement>();

    // act
    render(
      <SheetDialogHeader title="Request a check-in" titleRef={titleRef} />,
    );

    // assert
    const title = screen.getByRole("heading", { name: "Request a check-in" });
    expect(titleRef.current).toBe(title);
    expect(title).toHaveAttribute("tabindex", "-1");
    expect(title).toHaveClass("outline-none");
  });

  it("keeps its title out of the focus order when no caller focuses it", () => {
    // arrange
    // act
    render(<SheetDialogHeader title="Add measurements" />);

    // assert
    expect(
      screen.getByRole("heading", { name: "Add measurements" }),
    ).not.toHaveAttribute("tabindex");
  });

  it("draws its rule in the faint stroke when the sheet asks for it", () => {
    // arrange
    // act
    render(<SheetDialogHeader rule="faint" title="Request a check-in" />);

    // assert
    const band = screen.getByRole("heading", {
      name: "Request a check-in",
    }).parentElement;
    expect(band).toHaveClass("border-b", "border-stroke-faint");
    expect(band).not.toHaveClass("border-border-subtle");
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

describe("SheetDialogFooter", () => {
  it("pins its content under the body on the base surface above a rule", () => {
    // arrange
    // act
    render(
      <SheetDialogFooter>
        <button type="button">Request</button>
      </SheetDialogFooter>,
    );

    // assert
    expect(
      screen.getByRole("button", { name: "Request" }).parentElement,
    ).toHaveClass(
      "shrink-0",
      "border-t",
      "border-border-subtle",
      "bg-surface-base",
      "px-5",
      "py-3",
      "md:px-8",
      "md:py-4",
    );
  });

  it("draws its rule in the faint stroke when the sheet asks for it", () => {
    // arrange
    // act
    render(
      <SheetDialogFooter rule="faint">
        <button type="button">Request</button>
      </SheetDialogFooter>,
    );

    // assert
    const footer = screen.getByRole("button", {
      name: "Request",
    }).parentElement;
    expect(footer).toHaveClass("border-t", "border-stroke-faint");
    expect(footer).not.toHaveClass("border-border-subtle");
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
