// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, RouterProvider } from "react-router";
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
import { configureAxe } from "vitest-axe";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/contracts/paths";
import { CLIENT_ONBOARDING_PATH } from "~/features/coaching-sales/contracts/paths";
import type {
  OnboardingConsentInstants,
  OnboardingWizardPage,
  SaveDraftRequest,
  SubmitRequest,
} from "~/features/client-onboarding/contracts/onboarding";
import { CLIENT_ONBOARDING_API_PATHS } from "~/features/client-onboarding/contracts/paths";
import { CLIENT_PROFILE_API_PATHS } from "~/features/client-profile/contracts/paths";

import OnboardingRoute from "./onboarding-page";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const PENDING_DRAFT_KEY = `evoa.onboarding-pending.${CLIENT_ID}`;
const DRAFT_UPDATED_AT = "2026-09-27T10:00:00.000Z";
const CONSENTED_AT = "2026-09-27T09:00:00.000Z";
const RETRY_INTERVAL_MS = 15_000;
const SERVICE_TIMEOUT = 4000;
const IMPERIAL = { heightUnit: "ft-in", weightUnit: "lb" };

const UNSAVED_LINE = "Not saved yet. We'll try again when you're back online.";
const SUBMIT_PROBLEM =
  "Your answers could not be sent just now. They're saved — try again in a moment.";
const MISSING_CONSENT = "Tick the box to carry on.";
const PARQ_DECLARATION =
  "I have read, understood and completed this questionnaire. My answers are true and complete to the best of my knowledge. If my health changes, I will let my coach know and complete this questionnaire again.";
const PROGRESS_PHOTO_CONSENT =
  "I agree to share progress photos with my coach. They are only used to follow my progress, and I can ask for them to be deleted at any time. [Placeholder — Eli to replace with her own wording.]";

const FEMALE_FORMS: OnboardingWizardPage["formIds"] = [
  "goal-availability",
  "safety-screening",
  "cycle-context",
  "nutrition-lifestyle",
  "measurements",
];
const FOUR_PART_FORMS: OnboardingWizardPage["formIds"] = [
  "goal-availability",
  "safety-screening",
  "nutrition-lifestyle",
  "measurements",
];

const GIVEN_CONSENTS: OnboardingConsentInstants = {
  specialCategoryAt: CONSENTED_AT,
  disclaimerAt: CONSENTED_AT,
  progressPhotosAt: null,
};
const DISCLAIMER_WITHHELD: OnboardingConsentInstants = {
  specialCategoryAt: CONSENTED_AT,
  disclaimerAt: null,
  progressPhotosAt: null,
};
const DISCLAIMER =
  "The information I give is correct and complete, and I understand this program does not replace medical advice or a consultation with a doctor.";
const WITHHELD_CONSENTS: OnboardingConsentInstants = {
  specialCategoryAt: null,
  disclaimerAt: null,
  progressPhotosAt: null,
};

type PageOptions = {
  consents?: OnboardingConsentInstants;
  formIds?: OnboardingWizardPage["formIds"];
  gender?: OnboardingWizardPage["gender"];
  manualScreening?: boolean;
  resumed?: boolean;
  unitPreference?: OnboardingWizardPage["unitPreference"];
  answers?: OnboardingWizardPage["draft"]["answers"];
};

function emptyAnswers(): OnboardingWizardPage["draft"]["answers"] {
  return {
    "goal-availability": {},
    "safety-screening": {},
    "cycle-context": {},
    "nutrition-lifestyle": {},
    measurements: {},
  };
}

function answeredDraft(): OnboardingWizardPage["draft"]["answers"] {
  return {
    ...emptyAnswers(),
    "goal-availability": { weight: 66.1, height: 165 },
    measurements: { waist: 74 },
  };
}

function pageAt(
  currentFormIndex: number,
  options: PageOptions = {},
): OnboardingWizardPage {
  const gender = options.gender ?? "female";

  return {
    mode: "wizard",
    clientId: CLIENT_ID,
    formIds:
      options.formIds ?? (gender === "female" ? FEMALE_FORMS : FOUR_PART_FORMS),
    gender,
    manualScreening: options.manualScreening ?? false,
    draft: {
      answers: options.answers ?? answeredDraft(),
      currentFormIndex,
      consents: options.consents ?? GIVEN_CONSENTS,
      updatedAt: DRAFT_UPDATED_AT,
    },
    unitPreference: options.unitPreference ?? {
      weightUnit: "kg",
      heightUnit: "cm",
    },
    resumed: options.resumed ?? false,
  };
}

function firstVisit(): OnboardingWizardPage {
  return pageAt(0, { answers: emptyAnswers(), consents: WITHHELD_CONSENTS });
}

const server = setupServer();
const axe = configureAxe({ rules: { "color-contrast": { enabled: false } } });

let draftRequests: SaveDraftRequest[] = [];
let submitRequests: SubmitRequest[] = [];
let unitPreferenceRequests: unknown[] = [];

function answerDrafts(status: number) {
  server.use(
    http.put(`*${CLIENT_ONBOARDING_API_PATHS.draft}`, async ({ request }) => {
      draftRequests.push((await request.json()) as SaveDraftRequest);

      return status === 204
        ? new HttpResponse(null, { status })
        : HttpResponse.json({ message: "Unavailable" }, { status });
    }),
  );
}

function answerUnitPreferences(status: number) {
  server.use(
    http.put(
      `*${CLIENT_PROFILE_API_PATHS.unitPreference}`,
      async ({ request }) => {
        unitPreferenceRequests.push(await request.json());

        return status === 204
          ? new HttpResponse(null, { status })
          : HttpResponse.json({ message: "Unavailable" }, { status });
      },
    ),
  );
}

function answerSubmission(
  status: number,
  body: Record<string, unknown> | null = null,
) {
  server.use(
    http.post(
      `*${CLIENT_ONBOARDING_API_PATHS.submission}`,
      async ({ request }) => {
        submitRequests.push((await request.json()) as SubmitRequest);

        return HttpResponse.json(body, { status });
      },
    ),
  );
}

function lastDraft(): SaveDraftRequest | undefined {
  return draftRequests.at(-1);
}

function renderOnboarding(page: OnboardingWizardPage) {
  const router = createMemoryRouter(
    [
      {
        Component: OnboardingRoute,
        loader: () => page,
        path: CLIENT_ONBOARDING_PATH,
      },
      { Component: () => <p>portal home</p>, path: CLIENT_PORTAL_PATH },
    ],
    { initialEntries: [CLIENT_ONBOARDING_PATH] },
  );

  return render(
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>,
  );
}

async function openOnboarding(page: OnboardingWizardPage) {
  const view = renderOnboarding(page);
  await screen.findByRole("heading", { level: 2 });

  return view;
}

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  { control, option }: { control: RegExp; option: string },
) {
  screen.getByRole("combobox", { name: control }).focus();
  await user.keyboard("{Enter}");
  await user.click(await screen.findByRole("option", { name: option }));
}

async function answerRegularCycleDetails(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(
    screen.getByRole("radio", { name: "Yes, and it's regular" }),
  );
  await chooseOption(user, {
    control: /Are you using any contraception/,
    option: "None",
  });
  await user.click(screen.getByRole("checkbox", { name: "None of these" }));
  await chooseOption(user, {
    control: /Are you in perimenopause or menopause/,
    option: "No",
  });
}

function firstOfThisMonth(): RegExp {
  const today = new Date();
  const month = today.toLocaleString("en-US", { month: "long" });

  return new RegExp(`${month} 1st, ${today.getFullYear()}`);
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  Element.prototype.scrollIntoView = () => {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
});

beforeEach(() => {
  window.localStorage.clear();
  answerDrafts(204);
  answerUnitPreferences(204);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  server.resetHandlers();
  window.localStorage.clear();
  draftRequests = [];
  submitRequests = [];
  unitPreferenceRequests = [];
});

afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

describe("the onboarding", { timeout: 15_000 }, () => {
  it("opens the first form straight away, with no consent screen in front of it", async () => {
    // arrange
    const page = firstVisit();

    // act
    const { baseElement } = await openOnboarding(page);

    // assert
    const main = screen.getByRole("main", { name: "Let's get you set up" });
    expect(
      within(main).getByRole("heading", {
        level: 1,
        name: "Let's get you set up",
      }),
    ).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(within(main).getByText("Welcome to Evoa")).toBeVisible();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Your goal and your week",
    );
    expect(screen.getByText("Step 1 of 5")).toBeVisible();
    expect(
      screen.queryByRole("checkbox", { name: /I agree/ }),
    ).not.toBeInTheDocument();
    expect(document.activeElement).toBe(document.body);
    expect((await axe(baseElement)).violations).toEqual([]);
  });

  it("asks for the health-data consent on the safety form and holds her there without it", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(pageAt(1, { consents: WITHHELD_CONSENTS }));

    // act
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // assert
    expect(await screen.findByRole("alert")).toHaveTextContent(MISSING_CONSENT);
    expect(screen.getByText("Step 2 of 5")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "How I handle your data →" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("records when she gives the health-data consent", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(pageAt(1, { consents: WITHHELD_CONSENTS }));

    // act
    await user.click(
      screen.getByRole("checkbox", {
        name: "I agree that Evoa stores and uses my health and cycle answers to build and adjust my training program. I can withdraw this at any time.",
      }),
    );

    // assert
    await waitFor(() =>
      expect(lastDraft()?.consents.specialCategoryAt).toEqual(
        expect.any(String),
      ),
    );
    expect(lastDraft()).toMatchObject({
      currentFormIndex: 1,
      formId: "safety-screening",
    });
  });

  it("keeps the send button disabled until she ticks the disclaimer", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(pageAt(4, { consents: DISCLAIMER_WITHHELD }));
    const send = screen.getByRole("button", { name: "Send to my coach" });
    const disabledBeforeTicking = send.hasAttribute("disabled");

    // act
    await user.click(screen.getByRole("checkbox", { name: DISCLAIMER }));

    // assert
    expect(disabledBeforeTicking).toBe(true);
    expect(send).toBeEnabled();
    expect(screen.queryByText(MISSING_CONSENT)).not.toBeInTheDocument();
    expect(submitRequests).toEqual([]);
  });

  it("offers a two-option choice as radio buttons, not a dropdown", async () => {
    // arrange
    await openOnboarding(pageAt(3));

    // act
    const group = screen.getByRole("radiogroup", {
      name: /Where you want to hear from me/,
    });

    // assert
    expect(within(group).getAllByRole("radio")).toHaveLength(2);
    expect(within(group).getByRole("radio", { name: "Email" })).toBeVisible();
    expect(
      within(group).getByRole("radio", { name: "WhatsApp" }),
    ).toBeVisible();
  });

  it("asks how much she drinks and eats as a choice of amounts", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(pageAt(3));
    const meals = screen.getByRole("combobox", {
      name: /How many main meals do you usually have/,
    });

    // act
    screen.getByRole("combobox", { name: /Water in a normal day/ }).focus();
    await user.keyboard("{Enter}");

    // assert
    expect(
      (await screen.findAllByRole("option")).map(
        (option) => option.textContent,
      ),
    ).toEqual([
      "Not more than 2 glasses",
      "2–5 glasses",
      "5–8 glasses",
      "More than 8 glasses",
    ]);
    expect(meals).toHaveTextContent("Choose one");
  });

  it("offers a choice of more than two options as a select", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(firstVisit());

    // act
    screen.getByRole("combobox", { name: /Where you train/ }).focus();
    await user.keyboard("{Enter}");

    // assert
    expect(
      (await screen.findAllByRole("option")).map(
        (option) => option.textContent,
      ),
    ).toEqual(["Home", "Gym", "Both"]);
  });

  it("asks for every number as a number, bounded by the range the schema sets", async () => {
    // arrange
    await openOnboarding(firstVisit());

    // act
    const weight = screen.getByLabelText(/Your weight/);

    // assert
    expect(weight).toHaveAttribute("type", "number");
    expect(weight).toHaveAttribute("inputmode", "decimal");
    expect(weight).toHaveAttribute("min", "30");
    expect(weight).toHaveAttribute("max", "300");
  });

  it("turns down a weight outside the sensible range", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(firstVisit());

    // act
    await user.type(screen.getByLabelText(/Your weight/), "500");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // assert
    expect(
      await screen.findByText("Enter a weight between 30 and 300 kg."),
    ).toBeVisible();
    expect(screen.getByLabelText(/Your weight/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByText("Step 1 of 5")).toBeVisible();
  });

  it("checks an answer when she leaves it, not before", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(firstVisit());
    const weight = screen.getByLabelText(/Your weight/);

    // act
    await user.type(weight, "500");
    const beforeLeaving = screen.queryByText(
      "Enter a weight between 30 and 300 kg.",
    );
    await user.tab();

    // assert
    expect(beforeLeaving).not.toBeInTheDocument();
    expect(
      await screen.findByText("Enter a weight between 30 and 300 kg."),
    ).toBeVisible();
  });

  it("keeps a goal weight within reach of the weight she has now", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(firstVisit());

    // act
    await user.type(screen.getByLabelText(/Your weight/), "66");
    await user.type(screen.getByLabelText(/Target weight/), "200");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // assert
    expect(
      await screen.findByText(
        "Keep your goal within 60 kg of your current weight.",
      ),
    ).toBeVisible();
  });

  it("asks for the measurements without repeating the weight from the first form", async () => {
    // arrange
    const page = pageAt(4);

    // act
    await openOnboarding(page);

    // assert
    expect(screen.getByLabelText(/Waist/)).toBeVisible();
    expect(screen.queryByLabelText(/Weight/)).not.toBeInTheDocument();
  });

  it("asks for her agreement to share progress photos on the last form", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(pageAt(4));
    const photos = screen.getByRole("checkbox", {
      name: PROGRESS_PHOTO_CONSENT,
    });

    // act
    await user.click(photos);

    // assert
    expect(photos).toBeChecked();
    await waitFor(() =>
      expect(lastDraft()?.consents.progressPhotosAt).toEqual(
        expect.any(String),
      ),
    );
  });

  it("holds her on a form until the required answers are there", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(pageAt(2));

    // act
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // assert
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Your cycle and hormonal health",
      }),
    ).toBeVisible();
    expect(
      (await screen.findAllByText("Choose one option.")).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Choose at least one option.").length,
    ).toBeGreaterThan(0);
  });

  it("takes her to the first answer still missing when she tries to continue", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(pageAt(1));

    // act
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // assert
    await waitFor(() =>
      expect(
        screen.getByRole("radiogroup", {
          name: /Has your doctor ever said that you have a heart condition/,
        }),
      ).toContainElement(document.activeElement as HTMLElement),
    );
  });

  it("marks the answers she can skip as optional", async () => {
    // arrange
    await openOnboarding(firstVisit());

    // act
    const note = screen.getByRole("textbox", {
      name: /Is there anything else I should know when putting your program together\?\s*\(optional\)/,
    });

    // assert
    expect(note).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: /Where you train$/ }),
    ).toBeVisible();
    expect(screen.getByLabelText(/Your weight/)).not.toHaveAccessibleName(
      /\(optional\)/,
    );
  });

  it("reassures her plainly when she has no regular cycle", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(pageAt(2));

    // act
    await user.click(screen.getByRole("radio", { name: "No, or very rarely" }));

    // assert
    expect(
      screen.getByText(
        "That's completely fine — plenty of people train without a regular cycle. I'll build your plan around how you feel week to week instead.",
      ),
    ).toBeVisible();
  });

  it("hides the cycle length once she says she does not know it", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(pageAt(2));
    await answerRegularCycleDetails(user);
    const askedFirst = screen.queryByLabelText(/Average cycle length/) !== null;

    // act
    await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));

    // assert
    expect(askedFirst).toBe(true);
    expect(
      screen.queryByLabelText(/Average cycle length/),
    ).not.toBeInTheDocument();
  });

  it("lets her continue past the cycle step without a cycle length once she ticks that she is not sure", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(pageAt(2));
    await answerRegularCycleDetails(user);
    await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));
    await user.click(
      screen.getByRole("checkbox", { name: "I don't remember" }),
    );
    await user.click(screen.getByRole("radio", { name: "No" }));
    await user.click(screen.getByRole("checkbox", { name: "None" }));

    // act
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Food and daily life",
      }),
    ).toBeVisible();
    expect(screen.getByText("Step 4 of 5")).toBeVisible();
    await waitFor(() =>
      expect(lastDraft()).toMatchObject({
        currentFormIndex: 3,
        formId: "nutrition-lifestyle",
      }),
    );
    expect(lastDraft()?.answers["cycle-context"]).toMatchObject({
      cycleLengthUnknown: true,
      cycleRegularity: "Yes, and it's regular",
      lastPeriodUnknown: true,
    });
  });

  it("keeps the day her last period started quiet while she picks it, so her next answer lands", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(pageAt(2));
    await answerRegularCycleDetails(user);
    await user.click(
      screen.getByRole("button", { name: /The day your last period started/ }),
    );
    const openedQuietly = screen.queryByText("Pick a date.") === null;

    // act
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: firstOfThisMonth(),
      }),
    );
    await user.click(screen.getByRole("radio", { name: "No" }));

    // assert
    expect(openedQuietly).toBe(true);
    expect(screen.queryByText("Pick a date.")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "No" })).toBeChecked();
  });

  it("clears the other choices when she picks one that stands alone", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(pageAt(2));
    await user.click(screen.getByRole("checkbox", { name: "Pregnant" }));

    // act
    await user.click(screen.getByRole("checkbox", { name: "None of these" }));

    // assert
    expect(
      screen.getByRole("checkbox", { name: "None of these" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Pregnant" }),
    ).not.toBeChecked();
  });

  it("moves focus to the next form's heading when she continues", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(pageAt(1, { manualScreening: true }));

    // act
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // assert
    const heading = await screen.findByRole("heading", {
      level: 2,
      name: "Your cycle and hormonal health",
    });
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it("reads the step count with the next form's title when focus lands on it", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(pageAt(1, { manualScreening: true }));

    // act
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // assert
    const heading = await screen.findByRole("heading", {
      level: 2,
      name: "Your cycle and hormonal health",
    });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(heading).toHaveAccessibleDescription("Step 3 of 5");
  });

  it("counts four forms and leaves out the cycle for a male account", async () => {
    // arrange
    const page = pageAt(2, { gender: "male" });

    // act
    await openOnboarding(page);

    // assert
    expect(screen.getByText("Step 3 of 4")).toBeVisible();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Food and daily life",
    );
  });

  it("counts four forms and leaves out the cycle for a client who prefers not to say", async () => {
    // arrange
    const page = pageAt(2, { gender: "prefer_not_to_say" });

    // act
    await openOnboarding(page);

    // assert
    expect(screen.getByText("Step 3 of 4")).toBeVisible();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Food and daily life",
    );
  });

  it("asks a client who prefers not to say to agree to her health answers only", async () => {
    // arrange
    const page = pageAt(1, {
      consents: WITHHELD_CONSENTS,
      gender: "prefer_not_to_say",
    });

    // act
    await openOnboarding(page);

    // assert
    expect(screen.getByText("Step 2 of 4")).toBeVisible();
    expect(
      screen.getByText(
        "The next few questions are about your health. Your honest answers help me build a plan that's safe for you as well as effective.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("checkbox", {
        name: "I agree that Evoa stores and uses my health answers to build and adjust my training program. I can withdraw this at any time.",
      }),
    ).not.toBeChecked();
  });

  it("thanks her when none of the safety answers needs a doctor's sign-off", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(pageAt(1));
    for (const group of screen.getAllByRole("radiogroup")) {
      await user.click(within(group).getByRole("radio", { name: "No" }));
    }
    await user.click(screen.getByRole("checkbox", { name: PARQ_DECLARATION }));

    // act
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // assert
    expect(
      await screen.findByText(
        "Thank you. Nothing here needs a doctor's sign-off — let's keep going.",
      ),
    ).toBeVisible();
    expect(await screen.findByText("Step 3 of 5")).toBeVisible();
  });

  it("replaces the safety questions with a note when her age is outside their range", async () => {
    // arrange
    const page = pageAt(1, { manualScreening: true });

    // act
    await openOnboarding(page);

    // assert
    expect(
      screen.getByText(
        "These safety questions are designed for ages 15 to 69. I'll go through your health questions with you directly before building your program.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /I agree that Evoa stores/ }),
    ).toBeChecked();
  });

  it("saves her answers quietly as she types", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(firstVisit());

    // act
    await user.type(screen.getByLabelText(/Your weight/), "66");

    // assert
    expect(await screen.findByText("Saving…")).toBeVisible();
    expect(await screen.findByText("Saved")).toBeVisible();
    expect(draftRequests).toHaveLength(1);
    expect(lastDraft()).toMatchObject({
      answers: { "goal-availability": { weight: 66 } },
      consents: WITHHELD_CONSENTS,
      currentFormIndex: 0,
      formId: "goal-availability",
    });
  });

  it("tells her an answer is not saved yet while the connection is lost", async () => {
    // arrange
    const user = userEvent.setup();
    answerDrafts(503);
    await openOnboarding(firstVisit());

    // act
    await user.type(screen.getByLabelText(/Your weight/), "66");

    // assert
    expect(
      await screen.findByText(UNSAVED_LINE, undefined, {
        timeout: SERVICE_TIMEOUT,
      }),
    ).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(PENDING_DRAFT_KEY) ?? "null"),
    ).toMatchObject({
      draft: { answers: { "goal-availability": { weight: 66 } } },
    });
  });

  it("saves the unsent answers once the browser is back online", async () => {
    // arrange
    const user = userEvent.setup();
    answerDrafts(503);
    await openOnboarding(firstVisit());
    await user.type(screen.getByLabelText(/Your weight/), "66");
    await screen.findByText(UNSAVED_LINE, undefined, {
      timeout: SERVICE_TIMEOUT,
    });
    answerDrafts(204);

    // act
    fireEvent(window, new Event("online"));

    // assert
    expect(await screen.findByText("Saved")).toBeVisible();
    expect(lastDraft()?.answers["goal-availability"]).toEqual({ weight: 66 });
    expect(window.localStorage.getItem(PENDING_DRAFT_KEY)).toBeNull();
  });

  it("saves the unsent answers with her next change", async () => {
    // arrange
    const user = userEvent.setup();
    answerDrafts(503);
    await openOnboarding(firstVisit());
    await user.type(screen.getByLabelText(/Your weight/), "66");
    await screen.findByText(UNSAVED_LINE, undefined, {
      timeout: SERVICE_TIMEOUT,
    });
    answerDrafts(204);

    // act
    await user.type(screen.getByLabelText(/Your height/), "165");

    // assert
    expect(await screen.findByText("Saved")).toBeVisible();
    expect(lastDraft()?.answers["goal-availability"]).toEqual({
      height: 165,
      weight: 66,
    });
  });

  it("tries the unsent answers again on a timer while the connection is lost", async () => {
    // arrange
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    answerDrafts(503);
    await openOnboarding(firstVisit());
    await user.type(screen.getByLabelText(/Your weight/), "66");
    await screen.findByText(UNSAVED_LINE, undefined, {
      timeout: SERVICE_TIMEOUT,
    });
    answerDrafts(204);

    // act
    await act(() => vi.advanceTimersByTimeAsync(RETRY_INTERVAL_MS));

    // assert
    expect(await screen.findByText("Saved")).toBeVisible();
    expect(lastDraft()?.answers["goal-availability"]).toEqual({ weight: 66 });
  });

  it("picks up the answers this device could not send when they are newer than her saved draft", async () => {
    // arrange
    const unsent = {
      ...pageAt(0).draft,
      answers: {
        ...answeredDraft(),
        "goal-availability": { weight: 70, height: 165 },
      },
      consents: WITHHELD_CONSENTS,
      currentFormIndex: 0,
    };
    window.localStorage.setItem(
      PENDING_DRAFT_KEY,
      JSON.stringify({
        draft: {
          answers: unsent.answers,
          consents: unsent.consents,
          currentFormIndex: 0,
          formId: "goal-availability",
        },
        editedAt: "2026-09-27T11:00:00.000Z",
      }),
    );

    // act
    await openOnboarding(pageAt(0));

    // assert
    await waitFor(() =>
      expect(screen.getByLabelText(/Your weight/)).toHaveValue(70),
    );
    await waitFor(() =>
      expect(lastDraft()?.answers["goal-availability"]).toEqual({
        height: 165,
        weight: 70,
      }),
    );
    expect(await screen.findByText("Saved")).toBeVisible();
  });

  it("picks up the answers her first save could not send when she has no saved draft yet", async () => {
    // arrange
    const page = firstVisit();
    const unsentAnswers = {
      ...emptyAnswers(),
      "goal-availability": { weight: 70 },
    };
    window.localStorage.setItem(
      PENDING_DRAFT_KEY,
      JSON.stringify({
        draft: {
          answers: unsentAnswers,
          consents: WITHHELD_CONSENTS,
          currentFormIndex: 0,
          formId: "goal-availability",
        },
        editedAt: "2026-09-27T09:00:00.000Z",
      }),
    );

    // act
    await openOnboarding({
      ...page,
      draft: { ...page.draft, updatedAt: null },
    });

    // assert
    await waitFor(() =>
      expect(screen.getByLabelText(/Your weight/)).toHaveValue(70),
    );
    await waitFor(() =>
      expect(lastDraft()?.answers["goal-availability"]).toEqual({
        weight: 70,
      }),
    );
    expect(await screen.findByText("Saved")).toBeVisible();
  });

  it("keeps her saved draft over older answers this device could not send", async () => {
    // arrange
    window.localStorage.setItem(
      PENDING_DRAFT_KEY,
      JSON.stringify({
        draft: {
          answers: {
            ...emptyAnswers(),
            "goal-availability": { weight: 70 },
          },
          consents: WITHHELD_CONSENTS,
          currentFormIndex: 0,
          formId: "goal-availability",
        },
        editedAt: "2026-09-27T09:00:00.000Z",
      }),
    );

    // act
    await openOnboarding(pageAt(0));

    // assert
    expect(screen.getByLabelText(/Your weight/)).toHaveValue(66.1);
    await waitFor(() =>
      expect(window.localStorage.getItem(PENDING_DRAFT_KEY)).toBeNull(),
    );
    expect(draftRequests).toEqual([]);
  });

  it("throws away unsent answers this device stored in a shape it cannot read", async () => {
    // arrange
    window.localStorage.setItem(PENDING_DRAFT_KEY, "{not json");

    // act
    await openOnboarding(pageAt(0));

    // assert
    expect(screen.getByLabelText(/Your weight/)).toHaveValue(66.1);
    await waitFor(() =>
      expect(window.localStorage.getItem(PENDING_DRAFT_KEY)).toBeNull(),
    );
    expect(draftRequests).toEqual([]);
  });

  it("keeps her on the last form when her answers cannot be sent", async () => {
    // arrange
    const user = userEvent.setup();
    answerSubmission(503, { message: "Unavailable" });
    await openOnboarding(pageAt(4));

    // act
    await user.click(screen.getByRole("button", { name: "Send to my coach" }));

    // assert
    expect(await screen.findByText(SUBMIT_PROBLEM)).toBeVisible();
    expect(screen.getByText("Step 5 of 5")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Send to my coach" }),
    ).toBeEnabled();
  });

  it("resumes at the form she left", async () => {
    // arrange
    const page = pageAt(3, { resumed: true });

    // act
    await openOnboarding(page);

    // assert
    expect(screen.getByText("Step 4 of 5")).toBeVisible();
    expect(screen.getByText("Picking up where you left off.")).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "Food and daily life" }),
    ).toBeVisible();
  });

  it("sends the last form to her coach and closes the onboarding", async () => {
    // arrange
    const user = userEvent.setup();
    answerSubmission(200, { redirectTo: CLIENT_PORTAL_PATH });
    await openOnboarding(pageAt(4, { consents: DISCLAIMER_WITHHELD }));
    await user.click(screen.getByRole("checkbox", { name: DISCLAIMER }));

    // act
    await user.click(screen.getByRole("button", { name: "Send to my coach" }));

    // assert
    expect(await screen.findByText("portal home")).toBeVisible();
    expect(submitRequests).toEqual([
      {
        answers: answeredDraft(),
        consents: { ...DISCLAIMER_WITHHELD, disclaimerAt: expect.any(String) },
      },
    ]);
  });

  it("takes her to the dashboard when her answers were already sent", async () => {
    // arrange
    const user = userEvent.setup();
    answerSubmission(409, { error: "already-submitted" });
    await openOnboarding(pageAt(4));

    // act
    await user.click(screen.getByRole("button", { name: "Send to my coach" }));

    // assert
    expect(await screen.findByText("portal home")).toBeVisible();
  });

  it("shows her the form and the answer the coach's side could not accept", async () => {
    // arrange
    const user = userEvent.setup();
    answerSubmission(422, {
      problems: [
        {
          fieldId: "goalWeight",
          formId: "goal-availability",
          message: "Enter a weight.",
        },
      ],
    });
    await openOnboarding(pageAt(4));

    // act
    await user.click(screen.getByRole("button", { name: "Send to my coach" }));

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Your goal and your week",
      }),
    ).toBeVisible();
    expect(screen.getByText("Step 1 of 5")).toBeVisible();
    expect(await screen.findByText("Enter a weight.")).toBeVisible();
    expect(screen.getByLabelText(/Target weight/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("returns her to the consent the coach's side found missing", async () => {
    // arrange
    const user = userEvent.setup();
    answerSubmission(422, { consent: "special-category" });
    await openOnboarding(pageAt(4));

    // act
    await user.click(screen.getByRole("button", { name: "Send to my coach" }));

    // assert
    expect(await screen.findByText("Step 2 of 5")).toBeVisible();
    expect(screen.getByText(MISSING_CONSENT)).toBeVisible();
  });

  it("lets her pick the measurement system before the first measurement", async () => {
    // arrange
    await openOnboarding(firstVisit());

    // act
    const group = screen.getByRole("radiogroup", {
      name: "How do you measure?",
    });

    // assert
    expect(within(group).getByRole("radio", { name: "kg · cm" })).toBeChecked();
    expect(within(group).getByRole("radio", { name: "lb · in" })).toBeVisible();
    expect(screen.getByLabelText(/Your weight/)).toHaveAccessibleName(/\(kg\)/);
  });

  it("takes her weight in pounds and stores it in kilograms", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(firstVisit());
    await user.click(screen.getByRole("radio", { name: "lb · in" }));

    // act
    await user.type(screen.getByLabelText(/Your weight/), "150");

    // assert
    expect(screen.getByLabelText(/Your weight/)).toHaveAccessibleName(/\(lb\)/);
    expect(unitPreferenceRequests).toEqual([
      { heightUnit: "ft-in", weightUnit: "lb" },
    ]);
    await waitFor(() =>
      expect(lastDraft()?.answers["goal-availability"].weight).toBeCloseTo(
        68,
        1,
      ),
    );
  });

  it("keeps her units chosen and tries them again when saving them fails", async () => {
    // arrange
    const user = userEvent.setup();
    answerUnitPreferences(500);
    await openOnboarding(firstVisit());
    await user.click(screen.getByRole("radio", { name: "lb · in" }));
    await screen.findByText(UNSAVED_LINE, undefined, {
      timeout: SERVICE_TIMEOUT,
    });
    const unsentEntry = JSON.parse(
      window.localStorage.getItem(PENDING_DRAFT_KEY) ?? "null",
    );
    answerUnitPreferences(204);

    // act
    await user.type(screen.getByLabelText(/Your weight/), "150");

    // assert
    expect(unsentEntry).toEqual({ unitPreference: IMPERIAL });
    expect(await screen.findByText("Saved")).toBeVisible();
    expect(screen.getByRole("radio", { name: "lb · in" })).toBeChecked();
    expect(unitPreferenceRequests).toEqual([IMPERIAL, IMPERIAL]);
    expect(window.localStorage.getItem(PENDING_DRAFT_KEY)).toBeNull();
  });

  it("brings back the units this device could not send when she returns", async () => {
    // arrange
    window.localStorage.setItem(
      PENDING_DRAFT_KEY,
      JSON.stringify({ unitPreference: IMPERIAL }),
    );

    // act
    await openOnboarding(pageAt(0));

    // assert
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "lb · in" })).toBeChecked(),
    );
    expect(screen.getByLabelText(/Your weight/)).toHaveValue(145.7);
    expect(await screen.findByText("Saved")).toBeVisible();
    expect(unitPreferenceRequests).toEqual([IMPERIAL]);
    expect(window.localStorage.getItem(PENDING_DRAFT_KEY)).toBeNull();
  });

  it("turns down a weight outside the sensible range in pounds", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(firstVisit());
    await user.click(screen.getByRole("radio", { name: "lb · in" }));

    // act
    await user.type(screen.getByLabelText(/Your weight/), "1200");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // assert
    expect(
      await screen.findByText("Enter a weight between 66 and 661 lb."),
    ).toBeVisible();
  });

  it("converts what she already typed when she changes the measurement system", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(firstVisit());
    await user.type(screen.getByLabelText(/Your weight/), "68");

    // act
    await user.click(screen.getByRole("radio", { name: "lb · in" }));

    // assert
    expect(screen.getByLabelText(/Your weight/)).toHaveValue(149.9);
  });

  it("spells out her height in feet and inches while she works in inches", async () => {
    // arrange
    const user = userEvent.setup();
    await openOnboarding(firstVisit());
    await user.click(screen.getByRole("radio", { name: "lb · in" }));

    // act
    await user.type(screen.getByLabelText(/Your height/), "68");

    // assert
    expect(screen.getByText("5 ft 8 in")).toBeVisible();
  });

  it("shows the same answers in pounds when she comes back to the form", async () => {
    // arrange
    const page = pageAt(0, {
      unitPreference: { heightUnit: "ft-in", weightUnit: "lb" },
    });

    // act
    await openOnboarding(page);

    // assert
    expect(screen.getByLabelText(/Your weight/)).toHaveValue(145.7);
    expect(screen.getByLabelText(/Your height/)).toHaveValue(65);
    expect(screen.getByRole("radio", { name: "lb · in" })).toBeChecked();
  });
});
