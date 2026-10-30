// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { Link } from "./link";

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
});
