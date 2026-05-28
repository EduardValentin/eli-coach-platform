// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { PlatformQueryProvider } from "~/query-client";
import HomeRoute from "../home";

import MarketingLayoutRoute from "./layout";

const activeOffer = {
  plan: "12-months",
  slug: "12-months-launch-1",
} as const;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderMarketingHomeShell() {
  const router = createMemoryRouter([
    {
      children: [
        {
          index: true,
          element: <HomeRoute />,
        },
      ],
      element: <MarketingLayoutRoute />,
      loader: () => ({
        botDetectionConfig: {
          provider: "static",
          token: "XXXX.DUMMY.TOKEN.XXXX",
        },
        waitlist: {
          enabled: true,
          cap: 10,
          offer: activeOffer,
          spotsRemaining: null,
        },
      }),
      path: "/",
    },
  ]);

  render(
    <PlatformQueryProvider>
      <RouterProvider router={router} />
    </PlatformQueryProvider>,
  );
}

function mockWaitlistApi(handler: (request: Request) => Response | Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);

      return Promise.resolve(handler(request));
    }),
  );
}

function expectAllCloudsPressed(name: string, expectedPressed: boolean) {
  expect(
    screen
      .getAllByRole("button", { name })
      .every((button) => button.getAttribute("aria-pressed") === String(expectedPressed)),
  ).toBe(true);
}

function getFooterCta() {
  return screen.getByRole("region", { name: "Start your next step" });
}

function getCounterLabelsOutsideFooter(label: string) {
  const footer = getFooterCta();

  return screen.getAllByText(label).filter((counter) => !footer.contains(counter));
}

function expectMyMethodSectionVisible() {
  expect(screen.getByText("My method")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", {
      level: 2,
      name: "Why progress comes faster together.",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "No active cycle? Your plan still fits. Eli coaches you the same way.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "Eli reviews your workouts, listens to how you’re feeling, and adjusts the plan week by week.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByText("Progress, side by side")).toBeInTheDocument();
  expect(screen.getByText("With your coach")).toBeInTheDocument();
  expect(screen.getByText("On your own")).toBeInTheDocument();
}

describe("marketing layout UI integration", () => {
  it("hydrates the static shell with the live waitlist data", async () => {
    mockWaitlistApi(() =>
      Response.json({
        enabled: true,
        cap: 10,
        offer: activeOffer,
        spotsRemaining: 4,
      }),
    );

    renderMarketingHomeShell();

    expect(screen.queryByText("4 of 10 spots remaining")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText("4 of 10 spots remaining").length).toBeGreaterThanOrEqual(2);
      expect(within(getFooterCta()).getByText("4 of 10 spots remaining")).toBeInTheDocument();
      expect(getCounterLabelsOutsideFooter("4 of 10 spots remaining").length).toBeGreaterThanOrEqual(
        1,
      );
    });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 2, name: "Meet Eli, your coach" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Doors open soon. Get on the list so yours is held."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Don't miss your spot" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Join the waiting list and you'll be first to know when the 12-month program opens — plus a launch discount reserved only for early signups.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("A week of training")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Workouts that support your body",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sat")).toBeInTheDocument();
    expect(screen.getByText("Hypertrophy")).toBeInTheDocument();
    expect(screen.getByText("Nutrition that fits the picture")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Your cycle is part of the plan.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("DAY 25")).toBeInTheDocument();
    expect(screen.getByText("Luteal")).toBeInTheDocument();
    expect(
      screen.getByText("A few more complex carbs and root veggies to support the wind-down."),
    ).toBeInTheDocument();
    expectMyMethodSectionVisible();
    expect(screen.queryByRole("link", { name: "Start my plan" })).not.toBeInTheDocument();
  });

  it("shows footer full waitlist copy without a counter when the live waitlist data is full", async () => {
    mockWaitlistApi(() =>
      Response.json({
        enabled: true,
        cap: 10,
        offer: activeOffer,
        spotsRemaining: 0,
      }),
    );

    renderMarketingHomeShell();

    const footer = await screen.findByRole("region", { name: "Start your next step" });

    await waitFor(() => {
      expect(
        within(footer).getByRole("heading", { level: 2, name: "This round filled up fast." }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { level: 1, name: "Coaching built around your body." }),
    ).toBeInTheDocument();
    expect(
      within(footer).getByText(
        "Leave your email and you'll be first to know when the next spots open.",
      ),
    ).toBeInTheDocument();
    expect(within(footer).getByRole("button", { name: "Notify me" })).toBeInTheDocument();
    expect(
      within(footer).queryByText(/spots remaining|All spots have been claimed/i),
    ).not.toBeInTheDocument();
  });

  it("shows normal footer CTA links when the live waitlist data disables waitlist mode", async () => {
    mockWaitlistApi(() =>
      Response.json({
        enabled: false,
        cap: 10,
        offer: activeOffer,
        spotsRemaining: 0,
      }),
    );

    renderMarketingHomeShell();

    const footer = await screen.findByRole("region", { name: "Start your next step" });

    await waitFor(() => {
      expect(
        within(footer).getByRole("heading", {
          level: 2,
          name: "Not ready for 1-on-1 coaching?",
        }),
      ).toBeInTheDocument();
    });
    expect(
      within(footer).getByRole("link", { name: "Get the free starter pack" }),
    ).toHaveAttribute("href", "/store");
    expect(within(footer).getByRole("link", { name: "See coaching plans" })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });

  it("submits the footer waitlist form and refetches both homepage counters", async () => {
    const user = userEvent.setup();
    const requests: string[] = [];

    mockWaitlistApi(async (request) => {
      if (request.method === "POST") {
        requests.push("POST");

        const formData = await request.formData();

        expect(formData.get("email")).toBe("footer@example.com");

        return Response.json({
          success: true,
          offer: activeOffer,
          pricing: "reduced",
          spotsRemaining: 3,
        });
      }

      if (request.method === "GET") {
        requests.push("GET");

        return Response.json({
          enabled: true,
          cap: 10,
          offer: activeOffer,
          spotsRemaining: requests.length === 1 ? 4 : 3,
        });
      }

      return new Response(null, { status: 405 });
    });

    renderMarketingHomeShell();

    await waitFor(() => {
      expect(requests).toEqual(["GET"]);
      expect(within(getFooterCta()).getByText("4 of 10 spots remaining")).toBeInTheDocument();
      expect(getCounterLabelsOutsideFooter("4 of 10 spots remaining").length).toBeGreaterThanOrEqual(
        1,
      );
    });

    const footer = getFooterCta();

    await user.type(within(footer).getByLabelText("Email address"), "footer@example.com");
    await user.click(within(footer).getByRole("button", { name: "Join the list" }));

    await waitFor(() => {
      expect(requests).toEqual(["GET", "POST", "GET"]);
      expect(within(footer).getByText("3 of 10 spots remaining")).toBeInTheDocument();
      expect(getCounterLabelsOutsideFooter("3 of 10 spots remaining").length).toBeGreaterThanOrEqual(
        1,
      );
      expect(screen.queryByText("4 of 10 spots remaining")).not.toBeInTheDocument();
    });
  });

  it("keeps the static shell when the live waitlist data is unavailable", async () => {
    mockWaitlistApi(() => new Response("Not found", { status: 404 }));

    renderMarketingHomeShell();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Coaching built around your body." }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Error: 404 Not Found")).not.toBeInTheDocument();
  });

  it("switches the static shell to normal mode when the live waitlist data disables waitlist mode", async () => {
    mockWaitlistApi(() =>
      Response.json({
        enabled: false,
        cap: 10,
        offer: activeOffer,
        spotsRemaining: 0,
      }),
    );

    renderMarketingHomeShell();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Strength training for women." }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
    expect(
      screen.getByText("Ready to start? Let's build a plan you can actually stick to."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start my plan" })).toHaveAttribute(
      "href",
      "/book",
    );
    expect(screen.getByRole("link", { name: "See pricing" })).toHaveAttribute(
      "href",
      "/pricing",
    );
    expect(screen.getByText("A week of training")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Workouts that support your body",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sat")).toBeInTheDocument();
    expect(screen.getByText("Hypertrophy")).toBeInTheDocument();
    expect(screen.getByText("Nutrition that fits the picture")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Your cycle is part of the plan.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("DAY 25")).toBeInTheDocument();
    expect(screen.getByText("Luteal")).toBeInTheDocument();
    expect(
      screen.getByText("A few more complex carbs and root veggies to support the wind-down."),
    ).toBeInTheDocument();
    expectMyMethodSectionVisible();
  });

  it("includes the platform capabilities section and swaps the phone view from the home shell", async () => {
    const user = userEvent.setup();
    mockWaitlistApi(() =>
      Response.json({
        enabled: true,
        cap: 10,
        offer: activeOffer,
        spotsRemaining: 4,
      }),
    );

    renderMarketingHomeShell();

    await waitFor(() => {
      expect(screen.getByText("Your fitness, in one app")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Open your phone, see your plan.",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("group", { name: "App capabilities" })).toHaveLength(2);
    expect(screen.getByText("Lower Strength")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "Lower Strength" })).not.toBeInTheDocument();
    expectAllCloudsPressed("Personalized workouts", true);

    const nutritionButtons = screen.getAllByRole("button", { name: "Nutrition planner" });

    expectAllCloudsPressed("Nutrition planner", false);

    await user.click(nutritionButtons[0]);

    expectAllCloudsPressed("Nutrition planner", true);
    expectAllCloudsPressed("Personalized workouts", false);
    expect(screen.getByText("Today · April 17")).toBeInTheDocument();
    expect(screen.getByText("Your nutrition")).toBeInTheDocument();
    expect(screen.queryByText("Lower Strength")).not.toBeInTheDocument();
  });
});
