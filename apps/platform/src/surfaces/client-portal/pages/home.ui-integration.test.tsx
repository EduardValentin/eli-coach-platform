// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { createRoutesStub, Outlet } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import type { ProgramStatus } from "~/features/coaching-sales/contracts/client-journey";
import type { ClientShellPresentation } from "~/surfaces/client-portal/shell/client-identity-presentation";

import ClientHomeRoute from "./home";

afterEach(() => {
  cleanup();
});

type DashboardData = {
  detailsRequest: { note: string } | null;
  programStatus: ProgramStatus | null;
};

function renderDashboard(
  presentation: ClientShellPresentation,
  loaded: DashboardData = { detailsRequest: null, programStatus: null },
) {
  const RoutesStub = createRoutesStub([
    {
      children: [
        {
          Component: ClientHomeRoute,
          index: true,
          loader: () => loaded,
        },
      ],
      Component: () => <Outlet context={presentation} />,
      path: "/client",
    },
  ]);

  return render(<RoutesStub initialEntries={["/client"]} />);
}

describe("client dashboard", () => {
  it("welcomes the client back by her first name", async () => {
    // arrange, act
    renderDashboard({
      displayName: "Ana Popescu",
      greeting: "Welcome back, Ana.",
    });

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Welcome back, Ana.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Here is your daily snapshot and current focus."),
    ).toBeInTheDocument();
  });

  it("welcomes an account with no client record without a name", async () => {
    // arrange, act
    renderDashboard({ displayName: "Client", greeting: "Welcome back." });

    // assert
    expect(
      await screen.findByRole("heading", { level: 1, name: "Welcome back." }),
    ).toBeInTheDocument();
  });

  it("shows no program status card before she has submitted her onboarding", async () => {
    // arrange
    const presentation = {
      displayName: "Ana Popescu",
      greeting: "Welcome back, Ana.",
    };

    // act
    renderDashboard(presentation);
    await screen.findByRole("heading", { level: 1 });

    // assert
    expect(
      screen.queryByRole("region", { name: "Your onboarding" }),
    ).not.toBeInTheDocument();
  });

  it("shows her the program status card once she has sent her onboarding", async () => {
    // arrange
    const presentation = {
      displayName: "Ana Popescu",
      greeting: "Welcome back, Ana.",
    };
    const programStatus: ProgramStatus = {
      kind: "submitted",
      submittedAt: "2026-10-01T09:00:00.000Z",
      workStartsOn: null,
    };

    // act
    renderDashboard(presentation, { detailsRequest: null, programStatus });
    await screen.findByRole("heading", { level: 1 });

    // assert
    expect(
      screen.getByRole("region", { name: "Your onboarding" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sent to your coach")).toBeInTheDocument();
  });

  it("shows her what her coach asked and a way to answer while details are outstanding", async () => {
    // arrange
    const presentation = {
      displayName: "Ana Popescu",
      greeting: "Welcome back, Ana.",
    };
    const programStatus: ProgramStatus = {
      kind: "needs-details",
      submittedAt: "2026-10-01T09:00:00.000Z",
      workStartsOn: null,
    };

    // act
    renderDashboard(presentation, {
      detailsRequest: { note: "Which day suits you best now?" },
      programStatus,
    });
    await screen.findByRole("heading", { level: 1 });

    // assert
    const card = screen.getByRole("region", { name: "Your onboarding" });

    expect(
      within(card).getByText("Your coach needs a few more details"),
    ).toBeInTheDocument();
    expect(
      within(card).getByText("Which day suits you best now?"),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("link", { name: "Answer now" }),
    ).toHaveAttribute("href", "/client/onboarding?answer=1");
  });
});
