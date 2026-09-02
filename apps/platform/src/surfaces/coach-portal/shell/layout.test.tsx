// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";

import CoachLayoutRoute, { meta } from "./layout";

afterEach(() => {
  cleanup();
});

function renderCoachLayout() {
  return render(
    <MemoryRouter initialEntries={["/coach"]}>
      <CoachLayoutRoute />
    </MemoryRouter>,
  );
}

describe("CoachLayoutRoute", () => {
  it("renders the Evoa coach shell with labeled navigation landmarks", () => {
    // arrange, act
    renderCoachLayout();

    // assert
    const sidebar = screen.getByRole("complementary", {
      name: "Coach portal sidebar",
    });

    expect(within(sidebar).getByText("Evoa")).toBeInTheDocument();
    expect(within(sidebar).getByText("Coach Portal")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Coach portal navigation" }),
    ).toBeInTheDocument();
  });

  it("shows only the Dashboard link, since no other coach page exists yet", () => {
    // arrange, act
    renderCoachLayout();

    // assert
    const navigation = screen.getByRole("navigation", {
      name: "Coach portal navigation",
    });
    const links = within(navigation).getAllByRole("link");

    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName("Dashboard");
    expect(links[0]).toHaveAttribute("href", "/coach");
  });

  it("keeps the brand block non-navigating until a coach profile page exists", () => {
    // arrange, act
    renderCoachLayout();

    // assert
    const sidebar = screen.getByRole("complementary", {
      name: "Coach portal sidebar",
    });

    expect(
      within(sidebar).getByText("Evoa").closest("a"),
    ).toBeNull();
  });

  it("contains no notification bell until the coach notifications story", () => {
    // arrange, act
    renderCoachLayout();

    // assert
    expect(
      screen.queryByRole("button", { name: /notification/i }),
    ).not.toBeInTheDocument();
  });

  it("titles the document for the Evoa coach portal without referencing a manifest", () => {
    // arrange, act
    const descriptors = meta({} as never);

    // assert
    expect(descriptors).toContainEqual({ title: "Coach Portal | Evoa" });
  });
});
