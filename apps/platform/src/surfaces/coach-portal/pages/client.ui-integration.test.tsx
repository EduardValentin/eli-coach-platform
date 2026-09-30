// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { Toaster } from "@eli-coach-platform/ui/toast";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { ClientProfileView } from "~/features/client-onboarding/contracts/client-profile";
import type {
  OnboardingReviewView,
  SubmittedReview,
} from "~/features/client-onboarding/contracts/onboarding-review";
import type { CoachClient } from "~/features/coaching-sales/contracts/coach-clients";
import {
  COACH_CLIENTS_PATH,
  COACHING_SALES_API_PATHS,
  coachClientPath,
} from "~/features/coaching-sales/contracts/paths";

import CoachClientRoute, { ErrorBoundary } from "./client";

const COACH_TIME_ZONE = "Europe/Bucharest";
const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

const INVITED: CoachClient = {
  clientId: CLIENT_ID,
  email: "ana@example.com",
  firstName: "Ana",
  invitation: {
    expiresAt: "2026-10-20T09:00:00.000Z",
    sentAt: "2026-09-20T09:00:00.000Z",
    state: "pending",
  },
  lastName: "Popescu",
  assessmentCall: {
    startsAt: "2026-09-18T12:00:00.000Z",
    firstName: "Ana",
    lastName: "Popescu",
    email: "ana@example.com",
    dateOfBirth: "1994-03-14",
    gender: "female",
    country: "RO",
    phone: "+40712345678",
    primaryGoal: "build_strength",
    notes: "Wants to work on her glutes",
  },
  gender: "female",
  status: "invited",
  subscription: {
    bundleId: "3-months",
    months: 3,
    paidAt: "2026-09-20T09:00:00.000Z",
    reducedPrice: false,
    workStartsOn: null,
  },
};

const PROFILE: ClientProfileView = {
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: "+40712345678",
  heightCm: 168,
  startingWeightKg: 64.5,
  currentWeightKg: 64.5,
  activityLevel: "Lightly active",
  primaryGoal: "Lose fat",
  dietaryRestrictions: "Vegetarian",
  clientNotes: null,
};

const AWAITING_REVIEW: CoachClient = {
  ...INVITED,
  invitation: null,
  status: "awaiting-review",
};

const SUBMITTED: SubmittedReview = {
  checkInChannel: "WhatsApp",
  checkInDay: "Monday",
  cycleMode: "phase-based",
  forms: [
    {
      answered: 1,
      answers: [
        {
          fieldId: "primary-goal",
          flagged: false,
          label: "Primary goal",
          value: "Build strength",
        },
      ],
      formId: "goal-availability",
      title: "Goals and availability",
      total: 1,
    },
  ],
  openRequest: null,
  pregnancyContext: false,
  screening: { outcome: "cleared", yesCount: 0 },
  stage: "awaiting-review",
  withholdsNutritionAdvice: false,
};

const NOT_SUBMITTED: OnboardingReviewView = {
  clientId: CLIENT_ID,
  measurements: [],
  statedHeightCm: null,
  submitted: null,
};

const SUBMITTED_WITH_MEASUREMENTS: OnboardingReviewView = {
  clientId: CLIENT_ID,
  measurements: [
    {
      armCm: 30,
      hipsCm: 100,
      recordedAt: "2026-09-21T10:00:00.000Z",
      thighCm: 58,
      waistCm: 80,
      weightKg: 70,
    },
  ],
  statedHeightCm: 170,
  submitted: SUBMITTED,
};

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  coachIsIn(COACH_TIME_ZONE);
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

describe("the coach's client page", () => {
  it("heads the page with her name and email under a way back to the clients", async () => {
    // arrange, act
    await renderClientPage();

    // assert
    const title = screen.getByRole("heading", {
      level: 1,
      name: "Ana Popescu",
    });
    expect(title).toBeInTheDocument();
    expect(
      within(title.closest("header") as HTMLElement).getByText(
        "ana@example.com",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to Clients" }),
    ).toHaveAttribute("href", COACH_CLIENTS_PATH);
  });

  it("lays out her profile, invitation, onboarding, subscription, measurements and assessment call in that order", async () => {
    // arrange, act
    await renderClientPage();

    // assert
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual([
      "Profile",
      "Invitation",
      "Onboarding",
      "Subscription",
      "Measurements",
      "Assessment call",
    ]);
  });

  it("says her profile fills in once she sends her onboarding while it does not exist", async () => {
    // arrange, act
    await renderClientPage();

    // assert
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(
      within(profile).getByText(
        "Her profile fills in once she sends her onboarding.",
      ),
    ).toBeInTheDocument();
  });

  it("reads her profile once she has sent her onboarding", async () => {
    // arrange, act
    await renderClientPage({
      client: AWAITING_REVIEW,
      review: SUBMITTED_WITH_MEASUREMENTS,
      profile: PROFILE,
    });

    // assert
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(within(profile).getByText("Vegetarian")).toBeInTheDocument();
    expect(within(profile).queryByText(/profile fills in/)).toBeNull();
  });

  it("badges the onboarding panel with her client status", async () => {
    // arrange, act
    await renderClientPage();

    // assert
    const onboarding = screen.getByRole("region", { name: "Onboarding" });

    expect(within(onboarding).getByText("Invited")).toBeInTheDocument();
    expect(
      within(onboarding).getByText("Her answers are not in yet."),
    ).toBeInTheDocument();
  });

  it("reads her submitted answers and her measurements once she has sent them", async () => {
    // arrange, act
    await renderClientPage({
      client: AWAITING_REVIEW,
      review: SUBMITTED_WITH_MEASUREMENTS,
    });

    // assert
    const onboarding = screen.getByRole("region", { name: "Onboarding" });
    const measurements = screen.getByRole("region", { name: "Measurements" });

    expect(within(onboarding).getByText("Awaiting review")).toBeInTheDocument();
    expect(
      within(onboarding).getByRole("button", { name: "Review answers" }),
    ).toBeInTheDocument();
    expect(within(measurements).getByRole("table")).toBeInTheDocument();
    expect(
      within(measurements).queryByText(
        "She has not sent any measurements yet.",
      ),
    ).not.toBeInTheDocument();
  });

  it("drops the invitation once her account exists and the subscription when there is none", async () => {
    // arrange, act
    await renderClientPage({
      client: { ...AWAITING_REVIEW, subscription: null },
    });

    // assert
    expect(
      screen.queryByRole("region", { name: "Invitation" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Subscription" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("She has not sent any measurements yet."),
    ).toBeInTheDocument();
  });

  it("takes the coach back to her clients", async () => {
    // arrange
    const { router, user } = await renderClientRouter();

    // act
    await user.click(screen.getByRole("link", { name: "Back to Clients" }));

    // assert
    expect(router.state.location.pathname).toBe(COACH_CLIENTS_PATH);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Clients" }),
    ).toBeInTheDocument();
  });

  it("re-sends her invitation from the page and says where it went", async () => {
    // arrange
    server.use(
      http.post(COACHING_SALES_API_PATHS.invitationResends, () =>
        HttpResponse.json({ email: INVITED.email, status: "sent" }),
      ),
    );
    const { user } = await renderClientRouter();

    // act
    await user.click(
      screen.getByRole("button", { name: "Re-send invitation" }),
    );
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Re-send",
      }),
    );

    // assert
    expect(
      await screen.findByText("Invitation sent to ana@example.com."),
    ).toBeInTheDocument();
  });

  it("says the client cannot be found when no one on the roster has that id", async () => {
    // arrange, act
    await renderClientRouter(clientNotFound);

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Client not found",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This client is not on your roster, or the link is incorrect.",
      ),
    ).toBeInTheDocument();
  });
});

function coachIsIn(timeZone: string) {
  const actual = new Intl.DateTimeFormat().resolvedOptions();

  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...actual,
    timeZone,
  });
}

type ClientPageData = {
  client: CoachClient;
  review: OnboardingReviewView;
  profile: ClientProfileView | null;
};

function clientNotFound(): never {
  throw new Response("Not Found", { status: 404 });
}

async function renderClientRouter(
  load: () => ClientPageData = () => ({
    client: INVITED,
    review: NOT_SUBMITTED,
    profile: null,
  }),
) {
  const user = userEvent.setup();
  const forwardToServer = ({ request }: { request: Request }) => fetch(request);
  const router = createMemoryRouter(
    [
      {
        Component: () => (
          <>
            <Outlet />
            <Toaster />
          </>
        ),
        children: [
          {
            Component: CoachClientRoute,
            ErrorBoundary,
            loader: load,
            path: `${COACH_CLIENTS_PATH}/:clientId`,
          },
          {
            Component: () => <h1>Clients</h1>,
            path: COACH_CLIENTS_PATH,
          },
        ],
      },
      {
        action: forwardToServer,
        path: COACHING_SALES_API_PATHS.invitationResends,
      },
    ],
    { initialEntries: [coachClientPath(CLIENT_ID)] },
  );

  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { level: 1 });

  return { router, user };
}

async function renderClientPage(options: Partial<ClientPageData> = {}) {
  const { user } = await renderClientRouter(() => ({
    client: options.client ?? INVITED,
    review: options.review ?? NOT_SUBMITTED,
    profile: options.profile ?? null,
  }));

  return user;
}
