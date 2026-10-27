// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { PortalBackLink } from "./portal-back-link";

afterEach(() => {
  cleanup();
});

describe("PortalBackLink", () => {
  it("links back to the page it names, in the quiet back-link style", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <PortalBackLink to="/coach/clients">Back to Clients</PortalBackLink>
      </MemoryRouter>,
    );

    // assert
    const link = screen.getByRole("link", { name: "Back to Clients" });
    expect(link).toHaveAttribute("href", "/coach/clients");
    expect(link).toHaveClass(
      "mb-8",
      "inline-flex",
      "items-center",
      "gap-2",
      "text-sm",
      "font-medium",
      "text-text-secondary",
      "transition-colors",
      "hover:text-text-primary",
    );
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
