// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { Link, linkVariants } from "./link";

afterEach(() => {
  cleanup();
});

function renderLink(element: ReactElement) {
  const router = createMemoryRouter([{ element, path: "/" }]);

  render(<RouterProvider router={router} />);
}

describe("Link", () => {
  it("underlines an inline link only on hover", () => {
    // arrange
    // act
    renderLink(<Link to="/">Home</Link>);

    // assert
    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toHaveClass("text-brand-primary", "hover:underline");
    expect(link).not.toHaveClass("underline");
  });

  it("draws an underlined link with a quiet divider-coloured line that darkens on hover", () => {
    // arrange
    // act
    renderLink(
      <Link to="/" variant="underlined">
        Terms
      </Link>,
    );

    // assert
    expect(screen.getByRole("link", { name: "Terms" })).toHaveClass(
      "underline",
      "decoration-divider",
      "decoration-1",
      "underline-offset-2",
      "hover:decoration-current",
      "print:no-underline",
    );
  });

  it("widens the line-height hit area of an underlined link without moving its text", () => {
    // arrange
    // act
    const classes = linkVariants({ variant: "underlined" }).split(" ");

    // assert
    expect(classes).toEqual(expect.arrayContaining(["py-1", "-my-1"]));
  });

  it("gives a touch-reach link a full touch target that print drops", () => {
    // arrange
    // act
    renderLink(
      <Link to="/" variant="underlined" reach="touch">
        Terms
      </Link>,
    );

    // assert
    const link = screen.getByRole("link", { name: "Terms" });
    expect(link).toHaveClass(
      "inline-flex",
      "min-h-12",
      "items-center",
      "print:min-h-0",
    );
    expect(link).not.toHaveClass("py-1");
  });

  it("keeps the line reach as the default", () => {
    // arrange
    // act
    const classes = linkVariants({ variant: "underlined" });

    // assert
    expect(classes).toBe(
      linkVariants({ variant: "underlined", reach: "line" }),
    );
    expect(classes).not.toContain("min-h-12");
  });

  it("leaves the production inline link without the underline", () => {
    // arrange
    // act
    const classes = linkVariants({ variant: "inline" }).split(" ");

    // assert
    expect(classes).not.toContain("underline");
    expect(classes).not.toContain("py-1");
  });
});
