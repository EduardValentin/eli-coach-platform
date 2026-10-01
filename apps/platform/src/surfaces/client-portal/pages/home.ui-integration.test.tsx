// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { Toaster } from "@eli-coach-platform/ui/toast";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { StrictMode } from "react";
import {
  createMemoryRouter,
  createRoutesStub,
  Outlet,
  RouterProvider,
} from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import type { ProgramStatus } from "~/features/coaching-sales/contracts/client-journey";
import type { ClientShellPresentation } from "~/surfaces/client-portal/shell/client-identity-presentation";

import ClientHomeRoute, { type loader } from "./home";

afterEach(() => {
  cleanup();
});

type ClientDashboardLoad = Awaited<ReturnType<typeof loader>>;

const NOTHING_DUE: ClientDashboardLoad = {
  detailsRequest: null,
  dueLine: null,
  programStatus: null,
};

const ANA: ClientShellPresentation = {
  displayName: "Ana Popescu",
  greeting: "Welcome back, Ana.",
};

const SUBMITTED: ProgramStatus = {
  kind: "submitted",
  submittedAt: "2026-10-01T09:00:00.000Z",
  workStartsOn: null,
};

function renderDashboard(
  presentation: ClientShellPresentation,
  loaded: ClientDashboardLoad = NOTHING_DUE,
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
    renderDashboard(presentation, { ...NOTHING_DUE, programStatus });
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
      ...NOTHING_DUE,
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

  it("tells her when her weekly weigh-in is due and leads to her profile", async () => {
    // arrange, act
    renderDashboard(ANA, {
      ...NOTHING_DUE,
      dueLine: "weigh-in",
      programStatus: SUBMITTED,
    });
    await screen.findByRole("heading", { level: 1 });

    // assert
    expect(
      screen.getByRole("link", { name: "Your weekly weigh-in is due" }),
    ).toHaveAttribute("href", "/client/profile");
  });

  it("tells her when her measurements and photos are due", async () => {
    // arrange, act
    renderDashboard(ANA, {
      ...NOTHING_DUE,
      dueLine: "measurements",
      programStatus: SUBMITTED,
    });
    await screen.findByRole("heading", { level: 1 });

    // assert
    expect(
      screen.getByRole("link", {
        name: "Time for your measurements and photos",
      }),
    ).toHaveAttribute("href", "/client/profile");
    expect(
      screen.queryByRole("link", { name: "Your weekly weigh-in is due" }),
    ).not.toBeInTheDocument();
  });

  it("shows no measurements line while nothing is due", async () => {
    // arrange, act
    renderDashboard(ANA, { ...NOTHING_DUE, programStatus: SUBMITTED });
    await screen.findByRole("heading", { level: 1 });

    // assert
    expect(
      screen.queryByRole("link", { name: /weigh-in|measurements/ }),
    ).not.toBeInTheDocument();
  });
});

const FRONT_REFUSED =
  "The front photo could not be processed, so it was not saved.";
const BACK_REFUSED =
  "The back photo could not be processed, so it was not saved.";

const TOAST_RENDER_MS = 50;

async function settleToasts() {
  await act(
    () => new Promise((resolve) => setTimeout(resolve, TOAST_RENDER_MS)),
  );
}

function renderArrivalFromOnboarding(refusedPhotoViews: string[]) {
  const router = createMemoryRouter(
    [
      {
        children: [
          {
            Component: ClientHomeRoute,
            index: true,
            loader: () => ({ ...NOTHING_DUE, programStatus: SUBMITTED }),
          },
          { Component: () => <p>profile page</p>, path: "profile" },
        ],
        Component: () => <Outlet context={ANA} />,
        path: "/client",
      },
    ],
    {
      initialEntries: [
        "/client/onboarding",
        { pathname: "/client", state: { refusedPhotoViews } },
      ],
      initialIndex: 1,
    },
  );

  render(
    <StrictMode>
      <RouterProvider router={router} />
      <Toaster />
    </StrictMode>,
  );

  return router;
}

describe("client dashboard after she sends her onboarding", () => {
  it("names each photo the coach's side could not process, once", async () => {
    // arrange, act
    renderArrivalFromOnboarding(["front", "back"]);
    await screen.findByRole("heading", { level: 1 });

    // assert
    expect(await screen.findAllByText(FRONT_REFUSED)).toHaveLength(1);
    expect(screen.getAllByText(BACK_REFUSED)).toHaveLength(1);
  });

  it("does not name the photos again when she comes back to the dashboard", async () => {
    // arrange
    const router = renderArrivalFromOnboarding(["front"]);
    await screen.findAllByText(FRONT_REFUSED);

    // act
    await router.navigate("/client/profile");
    await screen.findByText("profile page");
    await router.navigate(-1);
    await screen.findByRole("heading", { level: 1 });
    await settleToasts();

    // assert
    expect(screen.getAllByText(FRONT_REFUSED)).toHaveLength(1);
  });

  it("shows no photo message when every photo was kept", async () => {
    // arrange, act
    renderArrivalFromOnboarding([]);
    await screen.findByRole("heading", { level: 1 });
    await settleToasts();

    // assert
    expect(
      screen.queryByText(/could not be processed/),
    ).not.toBeInTheDocument();
  });
});
