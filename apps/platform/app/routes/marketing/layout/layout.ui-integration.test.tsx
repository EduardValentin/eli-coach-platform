// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { PlatformQueryProvider } from "~/query-client";
import HomeRoute from "../home";
import PrivacyRoute from "../privacy";
import { WAITLIST_API_URL } from "../waitlist/waitlist-query";

import MarketingLayoutRoute from "./layout";

const server = setupServer();
const uiIntegrationWait = { timeout: 5_000 } as const;

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} as const;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function renderMarketingShell(initialEntry: "/" | "/privacy") {
  const router = createMemoryRouter(
    [
      {
        children: [
          {
            index: true,
            element: <HomeRoute />,
          },
          {
            element: <PrivacyRoute />,
            path: "privacy",
          },
        ],
        element: <MarketingLayoutRoute />,
        loader: () => ({
          botDetectionConfig: {
            provider: "static",
            token: "XXXX.DUMMY.TOKEN.XXXX",
          },
          waitlist: {
            availability: null,
            enabled: true,
            offer: activeOffer,
          },
        }),
        path: "/",
      },
    ],
    { initialEntries: [initialEntry] },
  );

  render(
    <PlatformQueryProvider>
      <RouterProvider router={router} />
    </PlatformQueryProvider>,
  );
}

function renderMarketingHomeShell() {
  renderMarketingShell("/");
}

function mockWaitlistApi(handler: (request: Request) => Response | Promise<Response>) {
  server.use(http.all(WAITLIST_API_URL, ({ request }) => handler(request)));
}

function expectAllCloudsPressed(name: string, expectedPressed: boolean) {
  expect(
    screen
      .getAllByRole("button", { name })
      .every((button) => button.getAttribute("aria-pressed") === String(expectedPressed)),
  ).toBe(true);
}

function getFooterCta() {
  return within(getPublicFooter()).getByRole("region", { name: "Start your next step" });
}

function getPublicFooter() {
  const publicFooters = screen.getAllByRole("contentinfo");

  expect(publicFooters).toHaveLength(1);

  return publicFooters[0];
}

function getAvailabilityLabelsOutsideFooter(label: string) {
  const footer = getFooterCta();

  return screen.getAllByText(label).filter((status) => !footer.contains(status));
}

function expectMyMethodSectionVisible() {
  expect(screen.getByText("My method")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", {
      level: 2,
      name: "Why progress is easier with support.",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "Whether you have an active menstrual cycle or not, your plan is still personalized around your body, energy, lifestyle, and goals.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "You’ll get weekly support, workout reviews, and plan adjustments based on your progress, energy, and schedule.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByText("Progress, side by side")).toBeInTheDocument();
  expect(screen.getByText("With your coach")).toBeInTheDocument();
  expect(screen.getByText("On your own")).toBeInTheDocument();
}

describe("marketing layout UI integration", () => {
  it("renders the Legal footer without the homepage CTA on a non-home public route", async () => {
    // arrange
    mockWaitlistApi(() =>
      HttpResponse.json({
        availability: "available",
        enabled: true,
        offer: activeOffer,
      }),
    );

    // act
    renderMarketingShell("/privacy");

    // assert
    expect(
      await screen.findByRole(
        "heading",
        { level: 1, name: "Privacy Policy" },
        uiIntegrationWait,
      ),
    ).toBeInTheDocument();

    const publicFooter = getPublicFooter();
    const legalNavigation = within(publicFooter).getByRole("navigation", { name: "Legal" });

    expect(within(legalNavigation).getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(
      screen.queryByRole("region", { name: "Start your next step" }),
    ).not.toBeInTheDocument();
  });

  it("hydrates the static shell with the live waitlist data", async () => {
    // arrange
    mockWaitlistApi(() =>
      HttpResponse.json({
        availability: "available",
        enabled: true,
        offer: activeOffer,
      }),
    );

    // act
    renderMarketingHomeShell();
    const liveAvailabilityBeforeHydration = screen.queryByText(
      "Reduced-price spots available",
    );

    // assert
    expect(liveAvailabilityBeforeHydration).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText("Reduced-price spots available").length).toBeGreaterThanOrEqual(2);
      expect(
        within(getFooterCta()).getByText("Reduced-price spots available"),
      ).toBeInTheDocument();
      expect(
        getAvailabilityLabelsOutsideFooter("Reduced-price spots available").length,
      ).toBeGreaterThanOrEqual(1);
    }, uiIntegrationWait);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/of \d+ spots remaining/i)).not.toBeInTheDocument();
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
        "Join the waiting list and you'll be first to know when coaching opens — plus reduced pricing on every plan, reserved for early signups.",
      ),
    ).toBeInTheDocument();
    const publicFooter = getPublicFooter();
    const footerCta = within(publicFooter).getByRole("region", {
      name: "Start your next step",
    });
    const legalNavigation = within(publicFooter).getByRole("navigation", { name: "Legal" });

    expect(footerCta.compareDocumentPosition(legalNavigation)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
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
    expect(screen.getByText("Complex carbs, protein-rich meals and root vegetables.")).toBeInTheDocument();
    expectMyMethodSectionVisible();
    expect(screen.queryByRole("link", { name: "Start my plan" })).not.toBeInTheDocument();
  });

  it("shows closed availability and keeps both forms usable", async () => {
    // arrange
    const user = userEvent.setup();
    mockWaitlistApi(() =>
      HttpResponse.json({
        availability: "closed",
        enabled: true,
        offer: activeOffer,
      }),
    );

    // act
    renderMarketingHomeShell();

    const footer = await screen.findByRole(
      "region",
      { name: "Start your next step" },
      uiIntegrationWait,
    );
    await within(footer).findByRole(
      "heading",
      { level: 2, name: "This round filled up fast." },
      uiIntegrationWait,
    );
    for (const emailInput of screen.getAllByLabelText("Email address")) {
      await user.type(emailInput, "visitor@example.com");
    }

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Coaching built around your body." }),
    ).toBeInTheDocument();
    expect(
      within(footer).getByText(
        "Leave your email and you'll be first to know when the next spots open.",
      ),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("button", { name: "Notify me" })
        .every((button) => !button.hasAttribute("disabled")),
    ).toBe(true);
    expect(screen.getAllByText("Reduced-price spots closed").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/of \d+ spots remaining/i)).not.toBeInTheDocument();
  });

  it("shows normal footer CTA links when the live waitlist data disables waitlist mode", async () => {
    // arrange
    mockWaitlistApi(() =>
      HttpResponse.json({
        availability: "closed",
        enabled: false,
        offer: activeOffer,
      }),
    );

    // act
    renderMarketingHomeShell();

    const footer = await screen.findByRole(
      "region",
      { name: "Start your next step" },
      uiIntegrationWait,
    );

    // assert
    await waitFor(() => {
      expect(
        within(footer).getByRole("heading", {
          level: 2,
          name: "Not ready for 1-on-1 coaching?",
        }),
      ).toBeInTheDocument();
    }, uiIntegrationWait);
    expect(
      within(footer).getByRole("link", { name: "Get the free starter pack" }),
    ).toHaveAttribute("href", "/store");
    expect(within(footer).getByRole("link", { name: "See coaching plans" })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });

  it("submits the footer waitlist form without an immediate availability refetch", async () => {
    // arrange
    const user = userEvent.setup();
    const requests: string[] = [];
    let submittedEmail: FormDataEntryValue | null = null;

    mockWaitlistApi(async (request) => {
      if (request.method === "POST") {
        requests.push("POST");

        const formData = await request.formData();

        submittedEmail = formData.get("email");

        return HttpResponse.json({
          success: true,
        });
      }

      if (request.method === "GET") {
        requests.push("GET");

        return HttpResponse.json({
          availability: "limited",
          enabled: true,
          offer: activeOffer,
        });
      }

      return new HttpResponse(null, { status: 405 });
    });

    renderMarketingHomeShell();

    await waitFor(() => {
      if (requests.length !== 1 || requests[0] !== "GET") {
        throw new Error("Expected the initial waitlist request to complete.");
      }

      if (!within(getFooterCta()).queryByText("Limited spots")) {
        throw new Error("Expected the footer to show the initial live availability.");
      }

      if (getAvailabilityLabelsOutsideFooter("Limited spots").length < 1) {
        throw new Error("Expected the initial live availability outside the footer.");
      }
    }, uiIntegrationWait);

    const footer = getFooterCta();

    // act
    await user.type(within(footer).getByLabelText("Email address"), "footer@example.com");
    await user.click(within(footer).getByRole("button", { name: "Join the list" }));

    // assert
    await waitFor(() => {
      expect(requests).toEqual(["GET", "POST"]);
      expect(submittedEmail).toBe("footer@example.com");
      expect(
        within(footer).getByText("You're in. Keep an eye on your inbox."),
      ).toBeInTheDocument();
      expect(within(footer).getByText("Limited spots")).toBeInTheDocument();
      expect(getAvailabilityLabelsOutsideFooter("Limited spots").length).toBeGreaterThanOrEqual(1);
    }, uiIntegrationWait);
  });

  it("keeps neutral static-shell copy and usable forms when live data is unavailable", async () => {
    // arrange
    const user = userEvent.setup();
    mockWaitlistApi(() => new HttpResponse("Not found", { status: 404 }));

    // act
    renderMarketingHomeShell();
    await screen.findByRole(
      "heading",
      { level: 1, name: "Coaching built around your body." },
      uiIntegrationWait,
    );
    const footer = getFooterCta();
    for (const emailInput of screen.getAllByLabelText("Email address")) {
      await user.type(emailInput, "visitor@example.com");
    }

    // assert
    expect(screen.queryByText("Error: 404 Not Found")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("Limited spots")).not.toBeInTheDocument();
    expect(
      screen.getAllByText("Join the waitlist to hear when coaching opens.").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      within(footer).getByText("Leave your email and you'll be first to know when coaching opens."),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("button", { name: "Join the list" })
        .every((button) => !button.hasAttribute("disabled")),
    ).toBe(true);
  });

  it("switches the static shell to normal mode when the live waitlist data disables waitlist mode", async () => {
    // arrange
    mockWaitlistApi(() =>
      HttpResponse.json({
        availability: "closed",
        enabled: false,
        offer: activeOffer,
      }),
    );

    // act
    renderMarketingHomeShell();

    // assert
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Strength training for women." }),
      ).toBeInTheDocument();
    }, uiIntegrationWait);
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
    expect(screen.getByText("Complex carbs, protein-rich meals and root vegetables.")).toBeInTheDocument();
    expectMyMethodSectionVisible();
  });

  it("includes the platform capabilities section and swaps the phone view from the home shell", async () => {
    // arrange
    const user = userEvent.setup();
    mockWaitlistApi(() =>
      HttpResponse.json({
        availability: "available",
        enabled: true,
        offer: activeOffer,
      }),
    );

    renderMarketingHomeShell();

    const platformEyebrow = await screen.findByText("Your fitness, in one app", {}, uiIntegrationWait);
    const platformHeading = screen.getByRole("heading", {
      level: 2,
      name: "Open your phone. See your plan.",
    });
    const appCapabilitiesGroupCount = screen.getAllByRole("group", {
      name: "App capabilities",
    }).length;
    const lowerStrengthWasVisible = screen.queryByText("Lower Strength") !== null;
    const lowerStrengthWasNotAHeading =
      screen.queryByRole("heading", { level: 3, name: "Lower Strength" }) === null;
    const personalizedWorkoutsWasPressed = screen
      .getAllByRole("button", { name: "Personalized workouts" })
      .every((button) => button.getAttribute("aria-pressed") === "true");
    const nutritionButtons = screen.getAllByRole("button", { name: "Nutrition planner" });
    const nutritionPlannerWasNotPressed = nutritionButtons.every(
      (button) => button.getAttribute("aria-pressed") === "false",
    );

    // act
    await user.click(nutritionButtons[0]);

    // assert
    expect(platformEyebrow).toBeInTheDocument();
    expect(platformHeading).toBeInTheDocument();
    expect(appCapabilitiesGroupCount).toBe(2);
    expect(lowerStrengthWasVisible).toBe(true);
    expect(lowerStrengthWasNotAHeading).toBe(true);
    expect(personalizedWorkoutsWasPressed).toBe(true);
    expect(nutritionPlannerWasNotPressed).toBe(true);
    expectAllCloudsPressed("Nutrition planner", true);
    expectAllCloudsPressed("Personalized workouts", false);
    expect(screen.getByText("Today · April 17")).toBeInTheDocument();
    expect(screen.getByText("Your nutrition")).toBeInTheDocument();
    expect(screen.queryByText("Lower Strength")).not.toBeInTheDocument();
  });
});
