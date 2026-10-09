// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { JoinLink } from "./join-link";

afterEach(() => {
  cleanup();
});

const JOIN_PATH = "/client/checkins/c-1/join";

describe("join link", () => {
  it("leads to the join path under its label", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <JoinLink emphasis={false} label="Join Meet" to={JOIN_PATH} />
      </MemoryRouter>,
    );

    // assert
    expect(screen.getByRole("link", { name: "Join Meet" })).toHaveAttribute(
      "href",
      JOIN_PATH,
    );
  });

  it("stays an outline action until it is emphasised", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <JoinLink emphasis={false} label="Join Meet" to={JOIN_PATH} />
      </MemoryRouter>,
    );

    // assert
    const link = screen.getByRole("link", { name: "Join Meet" });
    expect(link).toHaveClass("border", "bg-surface-base");
    expect(link).not.toHaveClass("bg-primary");
  });

  it("fills with the portal interaction colour when emphasised", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <JoinLink emphasis label="Join Meet" to={JOIN_PATH} />
      </MemoryRouter>,
    );

    // assert
    expect(screen.getByRole("link", { name: "Join Meet" })).toHaveClass(
      "bg-primary",
      "text-primary-foreground",
    );
  });

  it("takes the small action height unless a row asks for the compact one", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <JoinLink emphasis={false} label="Join Meet" to={JOIN_PATH} />
        <JoinLink emphasis={false} label="Join row" size="xs" to={JOIN_PATH} />
      </MemoryRouter>,
    );

    // assert
    expect(screen.getByRole("link", { name: "Join Meet" })).toHaveClass(
      "h-(--size-control-sm)",
    );
    expect(screen.getByRole("link", { name: "Join row" })).toHaveClass(
      "h-(--size-control-xs)",
    );
  });

  it("keeps its video glyph away from assistive technology", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <JoinLink emphasis={false} label="Join Meet" to={JOIN_PATH} />
      </MemoryRouter>,
    );

    // assert
    const glyph = screen
      .getByRole("link", { name: "Join Meet" })
      .querySelector("svg");
    expect(glyph).toHaveAttribute("aria-hidden", "true");
  });
});
