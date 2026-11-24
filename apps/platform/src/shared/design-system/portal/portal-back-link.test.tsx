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
      "relative",
      "hit-area",
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

  it("sits in a named navigation landmark that keeps the gap to the page when given a navigation label", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <PortalBackLink to="/coach/clients" navigationLabel="Back">
          Back to Clients
        </PortalBackLink>
      </MemoryRouter>,
    );

    // assert
    const navigation = screen.getByRole("navigation", { name: "Back" });
    expect(navigation).toHaveClass("mb-8");
    expect(
      screen.getByRole("link", { name: "Back to Clients" }),
    ).not.toHaveClass("mb-8");
  });

  it("sits close to the title that follows it when given the title gap", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <PortalBackLink gap="title" to="/coach/clients/ana">
          Ana Popescu
        </PortalBackLink>
      </MemoryRouter>,
    );

    // assert
    const link = screen.getByRole("link", { name: "Ana Popescu" });
    expect(link).toHaveClass("mb-1");
    expect(link).not.toHaveClass("mb-8");
  });
});
