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

import type { CheckInScheduling } from "~/features/check-ins/public/check-ins";
import type {
  OnboardingReviewView,
  SubmittedReview,
} from "~/features/client-onboarding/public/onboarding-review";
import type { ClientProfileView } from "~/features/client-profile/public/client-profile";
import type { MeasurementRow } from "~/features/client-profile/public/measurements";
import { coachClientResourcesPath } from "~/features/client-resources/public/paths";
import type { CoachClient } from "~/features/coaching-sales/public/coach-clients";
import {
  COACH_CLIENTS_PATH,
  COACHING_SALES_API_PATHS,
  coachClientPath,
} from "~/features/coaching-sales/public/paths";

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
  needsRefund: false,
  subscriptionCancelledOrEnded: false,
  subscription: {
    bundleId: "3-months",
    months: 3,
    paidAt: "2026-09-20T09:00:00.000Z",
    reducedPrice: false,
    workStartsOn: null,
    status: "not-started",
    endsOn: null,
    endedOn: null,
    refund: null,
  },
};

const AWAITING_ONBOARDING_PROFILE: ClientProfileView = {
  identity: {
    dateOfBirth: "1994-03-14",
    gender: "female",
    country: "RO",
    phone: "+40712345678",
  },
  facts: null,
  startingWeightKg: null,
  currentWeightKg: null,
};

const PROFILE: ClientProfileView = {
  ...AWAITING_ONBOARDING_PROFILE,
  facts: {
    heightCm: 168,
    activityLevel: "Lightly active",
    primaryGoal: "Lose fat",
    dietaryRestrictions: "Vegetarian",
    clientNotes: null,
  },
  startingWeightKg: 64.5,
  currentWeightKg: 64.5,
};

const AWAITING_REVIEW: CoachClient = {
  ...INVITED,
  invitation: null,
  status: "awaiting-review",
};

const ENDED_WITH_REFUND_DUE: CoachClient = {
  ...AWAITING_REVIEW,
  status: "inactive",
  needsRefund: true,
  subscriptionCancelledOrEnded: true,
  subscription: {
    ...AWAITING_REVIEW.subscription,
    bundleId: "3-months",
    months: 3,
    paidAt: "2026-09-20T09:00:00.000Z",
    reducedPrice: false,
    workStartsOn: "2026-10-04T09:00:00.000Z",
    status: "ended",
    endsOn: null,
    endedOn: "2026-09-25T09:00:00.000Z",
    refund: {
      reason: "full-refund",
      amountCents: 44700,
      outstandingCents: 44700,
      refundedCents: 0,
      currency: "eur",
      dueBy: "2026-10-09T09:00:00.000Z",
      refundedOn: null,
    },
  },
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
  submittedWaistCm: null,
  statedHeightCm: null,
  submitted: null,
};

const SUBMITTED_REVIEW: OnboardingReviewView = {
  clientId: CLIENT_ID,
  submittedWaistCm: 80,
  statedHeightCm: 170,
  submitted: SUBMITTED,
};

const SUBMITTED_MEASUREMENTS: MeasurementRow[] = [
  {
    armCm: 30,
    hipsCm: 100,
    id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
    photos: [],
    recordedAt: "2026-09-21T10:00:00.000Z",
    thighCm: 58,
    waistCm: 80,
    weightKg: 70,
  },
];

const MEASUREMENTS_WITH_PHOTOS: MeasurementRow[] = [
  ...SUBMITTED_MEASUREMENTS,
  {
    armCm: null,
    hipsCm: null,
    id: "9c8b7a6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
    photos: [
      { id: "0f1e2d3c-4b5a-4968-8776-655443322110", view: "front" },
      { id: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e", view: "side" },
    ],
    recordedAt: "2026-09-28T10:00:00.000Z",
    thighCm: null,
    waistCm: 79,
    weightKg: 69.4,
  },
];

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

  it("leads from her header to her resources", async () => {
    // arrange, act
    await renderClientPage();

    // assert
    const title = screen.getByRole("heading", {
      level: 1,
      name: "Ana Popescu",
    });
    expect(
      within(title.closest("header") as HTMLElement).getByRole("link", {
        name: "Resources",
      }),
    ).toHaveAttribute("href", coachClientResourcesPath(CLIENT_ID));
  });

  it("puts Schedule check-in after Resources in her header once she can answer", async () => {
    // arrange, act
    await renderClientPage({ scheduling: "allowed" });

    // assert
    const header = screen
      .getByRole("heading", { level: 1, name: "Ana Popescu" })
      .closest("header") as HTMLElement;
    const resources = within(header).getByRole("link", { name: "Resources" });
    const schedule = within(header).getByRole("button", {
      name: "Schedule check-in",
    });
    expect(
      resources.compareDocumentPosition(schedule) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(schedule).not.toHaveAttribute("aria-disabled");
  });

  it("holds Schedule check-in back before she sends her onboarding and says why on hover", async () => {
    // arrange
    const user = await renderClientPage({ scheduling: "awaiting_onboarding" });
    const schedule = screen.getByRole("button", { name: "Schedule check-in" });

    // act
    await user.hover(schedule);

    // assert
    expect(schedule).toHaveAttribute("aria-disabled", "true");
    expect(
      await screen.findByText(
        "She can answer a check-in once she has sent her onboarding.",
      ),
    ).toBeInTheDocument();
  });

  it("leaves Schedule check-in out once her coaching has ended", async () => {
    // arrange, act
    await renderClientPage({ scheduling: "ended" });

    // assert
    expect(
      screen.queryByRole("button", { name: "Schedule check-in" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resources" })).toBeInTheDocument();
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

  it("keeps the assessment call collapsed until the coach opens it", async () => {
    // arrange
    const { user } = await renderClientRouter();
    const call = screen.getByRole("region", { name: "Assessment call" });

    // act
    await user.click(
      within(call).getByRole("button", { name: "Assessment call" }),
    );

    // assert
    expect(
      within(call).getByRole("button", { name: "Assessment call" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(within(call).getByText("Build strength")).toBeVisible();
  });

  it("reads her identity and says her profile fills in once she sends her onboarding", async () => {
    // arrange, act
    await renderClientPage();

    // assert
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(
      within(profile).getByText(
        "Her profile fills in once she sends her onboarding.",
      ),
    ).toBeInTheDocument();
    expect(within(profile).getByText("Romania")).toBeInTheDocument();
  });

  it("reads her profile once she has sent her onboarding", async () => {
    // arrange, act
    await renderClientPage({
      client: AWAITING_REVIEW,
      review: SUBMITTED_REVIEW,
      profile: PROFILE,
      measurements: SUBMITTED_MEASUREMENTS,
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
      review: SUBMITTED_REVIEW,
      profile: PROFILE,
      measurements: SUBMITTED_MEASUREMENTS,
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

  it("offers her photos only on the entry that has them", async () => {
    // arrange, act
    await renderClientPage({
      client: AWAITING_REVIEW,
      review: SUBMITTED_REVIEW,
      profile: PROFILE,
      measurements: MEASUREMENTS_WITH_PHOTOS,
    });

    // assert
    const measurements = screen.getByRole("region", { name: "Measurements" });
    expect(
      within(measurements)
        .getAllByRole("button", { name: /^View photos/ })
        .map((action) => action.getAttribute("aria-label")),
    ).toEqual(["View photos from 28 September"]);
  });

  it("opens an entry's photos for the coach without a way to remove them", async () => {
    // arrange
    const user = await renderClientPage({
      client: AWAITING_REVIEW,
      review: SUBMITTED_REVIEW,
      profile: PROFILE,
      measurements: MEASUREMENTS_WITH_PHOTOS,
    });

    // act
    await user.click(
      screen.getByRole("button", { name: "View photos from 28 September" }),
    );

    // assert
    const photos = screen.getByRole("dialog", {
      name: "Photos from 28 September",
    });
    expect(photos).toHaveAccessibleDescription(
      "Only you and Ana can see these photos.",
    );
    expect(
      within(photos)
        .getAllByRole("img")
        .map((photo) => photo.getAttribute("alt")),
    ).toEqual(["Front photo", "Side photo"]);
    expect(within(photos).getByText("No back photo")).toBeInTheDocument();
    expect(
      within(photos).queryByRole("button", { name: /^Remove/ }),
    ).not.toBeInTheDocument();
  });

  it("closes her photos from Close and hands focus back to the entry's action", async () => {
    // arrange
    const user = await renderClientPage({
      client: AWAITING_REVIEW,
      review: SUBMITTED_REVIEW,
      profile: PROFILE,
      measurements: MEASUREMENTS_WITH_PHOTOS,
    });
    const action = screen.getByRole("button", {
      name: "View photos from 28 September",
    });
    await user.click(action);

    // act
    await user.click(
      within(screen.getByRole("dialog")).getAllByRole("button", {
        name: "Close",
      })[0],
    );

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(action).toHaveFocus();
  });

  it("closes her photos on Escape and hands focus back to the entry's action", async () => {
    // arrange
    const user = await renderClientPage({
      client: AWAITING_REVIEW,
      review: SUBMITTED_REVIEW,
      profile: PROFILE,
      measurements: MEASUREMENTS_WITH_PHOTOS,
    });
    const action = screen.getByRole("button", {
      name: "View photos from 28 September",
    });
    await user.click(action);

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(action).toHaveFocus();
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

  it("badges her name while a refund is still due and reads what is due on her subscription", async () => {
    // arrange, act
    await renderClientPage({
      client: ENDED_WITH_REFUND_DUE,
      review: SUBMITTED_REVIEW,
    });

    // assert
    const title = screen.getByRole("heading", {
      level: 1,
      name: "Ana Popescu",
    });
    const header = title.closest("header") as HTMLElement;
    const subscription = screen.getByRole("region", { name: "Subscription" });
    expect(within(header).getByText("Needs refund")).toBeInTheDocument();
    expect(within(subscription).getByText("Ended on")).toBeInTheDocument();
    expect(
      within(subscription).getByText("€447 by 9 October"),
    ).toBeInTheDocument();
    expect(
      within(subscription).getByText(
        "Full refund: cancelled within the 14-day withdrawal period.",
      ),
    ).toBeInTheDocument();
  });

  it("does not badge her name when no refund is due", async () => {
    // arrange, act
    await renderClientPage({
      client: AWAITING_REVIEW,
      review: SUBMITTED_REVIEW,
    });

    // assert
    expect(screen.queryByText("Needs refund")).not.toBeInTheDocument();
  });

  it.each([
    ["awaiting review", "awaiting-review"],
    ["in review", "in-review"],
  ] as const)(
    "keeps her answers readable %s but offers no review step once her coaching is cancelled",
    async (_label, stage) => {
      // arrange, act
      await renderClientPage({
        client: {
          ...AWAITING_REVIEW,
          status: "cancelled",
          subscriptionCancelledOrEnded: true,
        },
        review: {
          ...SUBMITTED_REVIEW,
          submitted: { ...SUBMITTED, stage },
        },
      });

      // assert
      const onboarding = screen.getByRole("region", { name: "Onboarding" });
      expect(within(onboarding).getByText("Cancelled")).toBeInTheDocument();
      expect(within(onboarding).getByText("Answers")).toBeInTheDocument();
      expect(
        within(onboarding).getByRole("button", {
          name: /Goals and availability/,
        }),
      ).toBeInTheDocument();
      for (const action of [
        "Review answers",
        "Continue review",
        "Approve answers",
      ]) {
        expect(
          within(onboarding).queryByRole("button", { name: action }),
        ).not.toBeInTheDocument();
      }
    },
  );

  it("keeps her invitation's state but offers no re-send once her coaching has ended", async () => {
    // arrange, act
    await renderClientPage({
      client: {
        ...INVITED,
        status: "inactive",
        subscriptionCancelledOrEnded: true,
      },
    });

    // assert
    const invitation = screen.getByRole("region", { name: "Invitation" });
    expect(
      within(invitation).getByText("Invited 20 September · expires 20 October"),
    ).toBeInTheDocument();
    expect(
      within(invitation).queryByRole("button", { name: "Re-send invitation" }),
    ).not.toBeInTheDocument();
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
  profile: ClientProfileView;
  measurements: MeasurementRow[];
  scheduling: CheckInScheduling;
};

function clientNotFound(): never {
  throw new Response("Not Found", { status: 404 });
}

async function renderClientRouter(
  load: () => ClientPageData = () => ({
    client: INVITED,
    review: NOT_SUBMITTED,
    profile: AWAITING_ONBOARDING_PROFILE,
    measurements: [],
    scheduling: "awaiting_onboarding",
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
    profile: options.profile ?? AWAITING_ONBOARDING_PROFILE,
    measurements: options.measurements ?? [],
    scheduling: options.scheduling ?? "awaiting_onboarding",
  }));

  return user;
}
