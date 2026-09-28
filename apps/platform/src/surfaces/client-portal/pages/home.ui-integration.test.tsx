// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { createRoutesStub, Outlet } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import type { ClientShellPresentation } from "~/surfaces/client-portal/shell/client-identity-presentation";

import ClientHomeRoute, { meta } from "./home";

afterEach(() => {
  cleanup();
});

function renderDashboard(presentation: ClientShellPresentation) {
  const RoutesStub = createRoutesStub([
    {
      children: [{ Component: ClientHomeRoute, index: true }],
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

  it("titles the page as the Evoa dashboard", () => {
    // arrange, act
    const descriptors = meta({} as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toEqual([{ title: "Dashboard | Evoa" }]);
  });
});
