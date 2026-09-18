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
    expect(link).toHaveClass(
      "text-brand-primary",
      "hover:underline",
      "focus-visible:outline-solid",
    );
    expect(link).not.toHaveClass("underline");
  });

  it("gives a standalone text action a semibold label and a full tap target", () => {
    // arrange
    // act
    renderLink(
      <Link placement="standalone" to="/">
        Return to Home
      </Link>,
    );

    // assert
    const link = screen.getByRole("link", { name: "Return to Home" });
    expect(link).toHaveClass(
      "inline-flex",
      "min-h-11",
      "items-center",
      "text-body-sm",
      "font-semibold",
      "hover:underline",
      "hover:text-brand-primary",
    );
    expect(link).not.toHaveClass(
      "font-medium",
      "underline",
      "hover:text-brand-primary-hover",
    );
  });

  it("styles a button as the same standalone text action", () => {
    // arrange
    // act
    render(
      <button
        className={linkVariants({ placement: "standalone" })}
        type="button"
      >
        Back
      </button>,
    );

    // assert
    const button = screen.getByRole("button", { name: "Back" });
    expect(button).toHaveClass("font-semibold", "min-h-11", "hover:underline");
    expect(button).not.toHaveClass("font-medium");
  });
});
