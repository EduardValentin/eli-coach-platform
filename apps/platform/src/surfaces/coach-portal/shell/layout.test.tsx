// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createRoutesStub } from "react-router";

import CoachLayoutRoute, { meta } from "./layout";
import type { CoachNavigationCounts } from "./navigation-links";

afterEach(() => {
  cleanup();
});

function renderCoachLayout(
  entry = "/coach",
  counts: CoachNavigationCounts = { checkInsAwaiting: 0 },
) {
  const RoutesStub = createRoutesStub([
    {
      children: [
        { Component: () => <p>Dashboard page</p>, index: true },
        { Component: () => <h1>Clients</h1>, path: "clients/*" },
        { Component: () => <h1>Exercises</h1>, path: "training/*" },
        { Component: () => <h1>Check-ins</h1>, path: "checkins" },
        {
          Component: () => <h1>Assessment calls</h1>,
          path: "assessment-calls",
        },
      ],
      Component: CoachLayoutRoute,
      loader: () => counts,
      path: "/coach",
    },
  ]);

  return render(<RoutesStub initialEntries={[entry]} />);
}

async function findNavigation() {
  return screen.findByRole("navigation", { name: "Coach portal navigation" });
}

describe("CoachLayoutRoute", () => {
  it("renders the Evoa coach shell with labeled navigation landmarks", async () => {
    // arrange, act
    renderCoachLayout();

    // assert
    const sidebar = await screen.findByRole("complementary", {
      name: "Coach portal sidebar",
    });

    expect(within(sidebar).getByText("Evoa")).toBeInTheDocument();
    expect(within(sidebar).getByText("Coach Portal")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Coach portal navigation" }),
    ).toBeInTheDocument();
  });

  it("names the mobile top bar for the coach portal", async () => {
    // arrange, act
    renderCoachLayout();

    // assert
    expect(
      await screen.findByRole("banner", { name: "Coach portal top bar" }),
    ).toBeInTheDocument();
  });

  it("opens the coach portal's mobile navigation from the top bar", async () => {
    // arrange
    const user = userEvent.setup();
    renderCoachLayout();

    // act
    await user.click(await screen.findByRole("button", { name: "Open menu" }));

    // assert
    expect(
      await screen.findByRole("dialog", {
        name: "Coach portal mobile navigation",
      }),
    ).toBeInTheDocument();
  });

  it("shows the coach pages that exist, Dashboard first and Training right after it", async () => {
    // arrange, act
    renderCoachLayout();

    // assert
    const navigation = await findNavigation();
    const links = within(navigation).getAllByRole("link");

    expect(
      links.map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Dashboard", "/coach"],
      ["Training", "/coach/training"],
      ["Clients", "/coach/clients"],
      ["Check-ins", "/coach/checkins"],
      ["Assessment calls", "/coach/assessment-calls"],
      ["Settings", "/coach/settings"],
    ]);
  });

  it("counts the check-ins waiting for her answer on the Check-ins entry", async () => {
    // arrange, act
    renderCoachLayout("/coach", { checkInsAwaiting: 3 });

    // assert
    const navigation = await findNavigation();

    expect(
      within(navigation).getByRole("link", {
        name: "Check-ins (3 waiting on you)",
      }),
    ).toHaveAttribute("href", "/coach/checkins");
  });

  it("shows no count on the Check-ins entry while nothing waits for her answer", async () => {
    // arrange, act
    renderCoachLayout("/coach", { checkInsAwaiting: 0 });

    // assert
    const navigation = await findNavigation();

    expect(
      within(navigation).getByRole("link", { name: "Check-ins" }),
    ).toHaveTextContent(/^Check-ins$/);
    expect(screen.queryByText(/waiting on you/)).not.toBeInTheDocument();
  });

  it("counts the check-ins waiting for her answer in the mobile navigation", async () => {
    // arrange
    const user = userEvent.setup();
    renderCoachLayout("/coach", { checkInsAwaiting: 1 });

    // act
    await user.click(await screen.findByRole("button", { name: "Open menu" }));

    // assert
    const menu = await screen.findByRole("dialog", {
      name: "Coach portal mobile navigation",
    });

    expect(
      within(menu).getByRole("link", { name: "Check-ins (1 waiting on you)" }),
    ).toBeInTheDocument();
  });

  it("marks the clients entry as the page being read on a client's page", async () => {
    // arrange, act
    renderCoachLayout("/coach/clients/4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11");

    // assert
    const navigation = await findNavigation();

    expect(
      within(navigation).getByRole("link", { name: "Clients" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("opens the exercise library from the Training entry in the mobile navigation", async () => {
    // arrange
    const user = userEvent.setup();
    renderCoachLayout();
    await user.click(await screen.findByRole("button", { name: "Open menu" }));
    const menu = await screen.findByRole("dialog", {
      name: "Coach portal mobile navigation",
    });

    // act
    await user.click(within(menu).getByRole("link", { name: "Training" }));

    // assert
    expect(
      await screen.findByRole("heading", { level: 1, name: "Exercises" }),
    ).toBeInTheDocument();
  });

  it("keeps the Training entry marked while she edits an exercise", async () => {
    // arrange, act
    renderCoachLayout(
      "/coach/training/exercises/4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
    );

    // assert
    const navigation = await findNavigation();

    expect(
      within(navigation).getByRole("link", { name: "Training" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("marks the check-ins entry as the page being read", async () => {
    // arrange, act
    renderCoachLayout("/coach/checkins");

    // assert
    const navigation = await findNavigation();

    expect(
      within(navigation).getByRole("link", { name: "Check-ins" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("marks the assessment calls entry as the page being read", async () => {
    // arrange, act
    renderCoachLayout("/coach/assessment-calls");

    // assert
    const navigation = await findNavigation();

    expect(
      within(navigation).getByRole("link", { name: "Assessment calls" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(navigation).getByRole("link", { name: "Dashboard" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("keeps the brand block non-navigating until a coach profile page exists", async () => {
    // arrange, act
    renderCoachLayout();

    // assert
    const sidebar = await screen.findByRole("complementary", {
      name: "Coach portal sidebar",
    });

    expect(within(sidebar).getByText("Evoa").closest("a")).toBeNull();
  });

  it("contains no notification bell until the coach notifications story", async () => {
    // arrange, act
    renderCoachLayout();

    // assert
    await findNavigation();
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
