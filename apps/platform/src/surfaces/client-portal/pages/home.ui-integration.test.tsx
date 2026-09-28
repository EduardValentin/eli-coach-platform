// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { createRoutesStub, Outlet } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import type { ProgramStatus } from "~/features/coaching-sales/contracts/client-journey";
import type { ClientShellPresentation } from "~/surfaces/client-portal/shell/client-identity-presentation";

import ClientHomeRoute from "./home";

afterEach(() => {
  cleanup();
});

function renderDashboard(
  presentation: ClientShellPresentation,
  programStatus: ProgramStatus | null = null,
) {
  const RoutesStub = createRoutesStub([
    {
      children: [
        {
          Component: ClientHomeRoute,
          index: true,
          loader: () => programStatus,
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
    // arrange, act
    renderDashboard(
      { displayName: "Ana Popescu", greeting: "Welcome back, Ana." },
      null,
    );
    await screen.findByRole("heading", { level: 1 });

    // assert
    expect(
      screen.queryByRole("region", { name: "Your onboarding" }),
    ).not.toBeInTheDocument();
  });

  it("shows her the program status card once she has sent her onboarding", async () => {
    // arrange, act
    renderDashboard(
      { displayName: "Ana Popescu", greeting: "Welcome back, Ana." },
      {
        kind: "submitted",
        submittedAt: "2026-10-01T09:00:00.000Z",
        workStartsOn: null,
      },
    );
    await screen.findByRole("heading", { level: 1 });

    // assert
    expect(
      screen.getByRole("region", { name: "Your onboarding" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sent to your coach")).toBeInTheDocument();
  });
});
