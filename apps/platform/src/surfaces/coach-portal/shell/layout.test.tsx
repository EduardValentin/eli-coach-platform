// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createRoutesStub } from "react-router";

import type { NotificationBellReply } from "~/features/notifications/public/notifications";

import CoachLayoutRoute, { meta } from "./layout";
import type { CoachNavigationCounts } from "./navigation-links";

const CHECK_IN_ID = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

const EMPTY_BELL: NotificationBellReply = {
  notifications: [],
  unreadCount: 0,
  checkedAt: "2026-10-15T12:00:00.000Z",
};

const REQUEST_BELL: NotificationBellReply = {
  notifications: [
    {
      id: "1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e",
      kind: "check-in.requested",
      facts: {
        checkInId: CHECK_IN_ID,
        startsAt: "2026-10-16T15:00:00.000Z",
        clientName: "Jane Doe",
      },
      arrivedAt: "2026-10-15T11:00:00.000Z",
      unread: true,
    },
  ],
  unreadCount: 1,
  checkedAt: "2026-10-15T12:00:00.000Z",
};

afterEach(() => {
  cleanup();
});

function renderCoachLayout(
  entry = "/coach",
  counts: CoachNavigationCounts = { checkInsAwaiting: 0 },
  bell: NotificationBellReply = EMPTY_BELL,
) {
  const RoutesStub = createRoutesStub([
    {
      children: [
        { Component: () => <p>Dashboard page</p>, index: true },
        { Component: () => <h1>Clients</h1>, path: "clients/*" },
        { Component: () => <h1>Check-ins</h1>, path: "checkins" },
        {
          Component: () => <h1>Assessment calls</h1>,
          path: "assessment-calls",
        },
      ],
      Component: CoachLayoutRoute,
      loader: () => ({ ...counts, bell }),
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

  it("shows the coach pages that exist, Dashboard first", async () => {
    // arrange, act
    renderCoachLayout();

    // assert
    const navigation = await findNavigation();
    const links = within(navigation).getAllByRole("link");

    expect(links).toHaveLength(5);
    expect(links[0]).toHaveAccessibleName("Dashboard");
    expect(links[0]).toHaveAttribute("href", "/coach");
    expect(links[1]).toHaveAccessibleName("Clients");
    expect(links[1]).toHaveAttribute("href", "/coach/clients");
    expect(links[2]).toHaveAccessibleName("Check-ins");
    expect(links[2]).toHaveAttribute("href", "/coach/checkins");
    expect(links[3]).toHaveAccessibleName("Assessment calls");
    expect(links[3]).toHaveAttribute("href", "/coach/assessment-calls");
    expect(links[4]).toHaveAccessibleName("Settings");
    expect(links[4]).toHaveAttribute("href", "/coach/settings");
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

  it("carries her notification bell in the sidebar and the top bar, named for what waits unread", async () => {
    // arrange, act
    renderCoachLayout("/coach", { checkInsAwaiting: 0 }, REQUEST_BELL);

    // assert
    const sidebar = await screen.findByRole("complementary", {
      name: "Coach portal sidebar",
    });
    const topBar = screen.getByRole("banner", { name: "Coach portal top bar" });
    expect(
      within(sidebar).getByRole("button", { name: "Notifications, 1 unread" }),
    ).toBeInTheDocument();
    expect(
      within(topBar).getByRole("button", { name: "Notifications, 1 unread" }),
    ).toBeInTheDocument();
  });

  it("words a check-in notification for her and opens the check-in it names", async () => {
    // arrange
    const user = userEvent.setup();
    renderCoachLayout("/coach", { checkInsAwaiting: 0 }, REQUEST_BELL);
    const sidebar = await screen.findByRole("complementary", {
      name: "Coach portal sidebar",
    });

    // act
    await user.click(
      within(sidebar).getByRole("button", { name: "Notifications, 1 unread" }),
    );

    // assert
    const bell = await screen.findByRole("dialog", { name: "Notifications" });
    const row = within(bell).getByRole("link");
    expect(row).toHaveTextContent("Check-in requested");
    expect(row).toHaveTextContent(/Jane Doe asked for a check-in on /);
    expect(row).toHaveAttribute(
      "href",
      `/coach/checkins?checkin=${CHECK_IN_ID}`,
    );
  });

  it("names her bell plainly while nothing is unread", async () => {
    // arrange, act
    renderCoachLayout();

    // assert
    await findNavigation();
    expect(
      screen.getAllByRole("button", { name: "Notifications" }),
    ).toHaveLength(2);
  });

  it("titles the document for the Evoa coach portal without referencing a manifest", () => {
    // arrange, act
    const descriptors = meta({} as never);

    // assert
    expect(descriptors).toContainEqual({ title: "Coach Portal | Evoa" });
  });
});
