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

  it("shows the coach pages that exist, Dashboard first", () => {
    // arrange, act
    renderCoachLayout();

    // assert
    const navigation = screen.getByRole("navigation", {
      name: "Coach portal navigation",
    });
    const links = within(navigation).getAllByRole("link");

    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAccessibleName("Dashboard");
    expect(links[0]).toHaveAttribute("href", "/coach");
    expect(links[1]).toHaveAccessibleName("Assessment calls");
    expect(links[1]).toHaveAttribute("href", "/coach/assessment-calls");
    expect(links[2]).toHaveAccessibleName("Settings");
    expect(links[2]).toHaveAttribute("href", "/coach/settings");
  });

  it("marks the assessment calls entry as the page being read", () => {
    // arrange, act
    render(
      <MemoryRouter initialEntries={["/coach/assessment-calls"]}>
        <CoachLayoutRoute />
      </MemoryRouter>,
    );

    // assert
    const navigation = screen.getByRole("navigation", {
      name: "Coach portal navigation",
    });

    expect(
      within(navigation).getByRole("link", { name: "Assessment calls" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(navigation).getByRole("link", { name: "Dashboard" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("keeps the brand block non-navigating until a coach profile page exists", () => {
    // arrange, act
    renderCoachLayout();

    // assert
    const sidebar = screen.getByRole("complementary", {
      name: "Coach portal sidebar",
    });

    expect(within(sidebar).getByText("Evoa").closest("a")).toBeNull();
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
