// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { Toaster } from "@eli-coach-platform/ui/toast";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ComponentProps } from "react";
import {
  createMemoryRouter,
  RouterProvider,
  useLoaderData,
} from "react-router";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type {
  OnboardingReviewView,
  ReviewStage,
  SubmittedReview,
} from "~/features/client-onboarding/contracts/onboarding-review";
import { CLIENT_ONBOARDING_API_PATHS } from "~/features/client-onboarding/contracts/paths";

import { OnboardingPanel } from "./onboarding-panel";

type ReviewedClient = ComponentProps<typeof OnboardingPanel>["client"];

const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";
const CLIENT = {
  email: "ana@example.com",
  firstName: "Ana",
  gender: "female",
} satisfies ReviewedClient;
const PAGE_PATH = "/coach/clients/ana";
const STATUS_BADGE = "Awaiting review";

const SUBMITTED: SubmittedReview = {
  checkInChannel: "WhatsApp",
  checkInDay: "Monday",
  cycleMode: "phase-based",
  forms: [
    {
      answered: 2,
      answers: [
        {
          fieldId: "primary-goal",
          flagged: false,
          label: "Primary goal",
          value: "Build strength",
        },
        {
          fieldId: "training-days",
          flagged: false,
          label: "Training days",
          value: "3",
        },
        {
          fieldId: "injuries",
          flagged: false,
          label: "Injuries",
          value: null,
        },
      ],
      formId: "goal-availability",
      title: "Goals and availability",
      total: 3,
    },
    {
      answered: 1,
      answers: [
        {
          fieldId: "heart-condition",
          flagged: true,
          label: "Heart condition",
          value: "Yes",
        },
      ],
      formId: "safety-screening",
      title: "Safety screening",
      total: 1,
    },
  ],
  openRequest: null,
  pregnancyContext: false,
  screening: { outcome: "cleared", yesCount: 0 },
  stage: "awaiting-review",
  withholdsNutritionAdvice: false,
};

const OPEN_REQUEST = {
  askedAt: "2026-09-28T10:00:00.000Z",
  note: "Tell me more about your goal and your heart.",
  questions: [
    { fieldId: "primary-goal", formId: "goal-availability" },
    { fieldId: "heart-condition", formId: "safety-screening" },
  ],
} satisfies SubmittedReview["openRequest"];

const MEASUREMENTS = [
  {
    armCm: 30,
    hipsCm: 100,
    recordedAt: "2026-09-01T10:00:00.000Z",
    thighCm: 58,
    waistCm: 80,
    weightKg: 70,
  },
  {
    armCm: 29.5,
    hipsCm: 98,
    recordedAt: "2026-09-20T10:00:00.000Z",
    thighCm: 57,
    waistCm: 76.5,
    weightKg: 68.4,
  },
];

const server = setupServer();

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

describe("the onboarding panel on a client page", () => {
  it("says her answers are not in while she has not submitted", async () => {
    // arrange, act
    await renderPanel({ review: reviewView(null) });

    // assert
    expect(screen.getByText(STATUS_BADGE)).toBeInTheDocument();
    expect(screen.getByText("Her answers are not in yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers to review or approve answers awaiting review", async () => {
    // arrange, act
    await renderPanel({
      review: reviewView(submittedReviewIn("awaiting-review")),
    });

    // assert
    expect(
      screen.getByRole("heading", { level: 2, name: "Onboarding" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Waist-to-height ratio")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Review answers" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Approve answers" }),
    ).toBeInTheDocument();
  });

  it("offers to continue or approve a review in progress", async () => {
    // arrange, act
    await renderPanel({ review: reviewView(submittedReviewIn("in-review")) });

    // assert
    expect(
      screen.getByRole("button", { name: "Continue review" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Approve answers" }),
    ).toBeInTheDocument();
  });

  it("shows what she was asked again while details are outstanding", async () => {
    // arrange
    const user = await renderPanel({
      review: reviewView({
        ...submittedReviewIn("needs-details"),
        openRequest: OPEN_REQUEST,
      }),
    });

    // act
    await user.click(
      screen.getByRole("button", { name: /^Goals and availability/ }),
    );

    // assert
    expect(
      screen.getByText("Waiting on 2 answers · asked 28 September"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Tell me more about your goal and your heart."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Goals and availability/ }),
    ).toHaveTextContent("1 asked again");
    expect(screen.getAllByText("Asked again")).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: /review/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Approve answers" }),
    ).not.toBeInTheDocument();
  });

  it("offers nothing once her answers are approved", async () => {
    // arrange, act
    await renderPanel({ review: reviewView(submittedReviewIn("approved")) });

    // assert
    expect(
      screen.queryByRole("button", { name: /review|approve/i }),
    ).not.toBeInTheDocument();
  });
});

describe("the screening signal beside the panel title", () => {
  it("counts the yes answers when the screening needs a look", async () => {
    // arrange, act
    await renderPanel({
      review: reviewView({
        ...SUBMITTED,
        screening: { outcome: "needs-review", yesCount: 1 },
      }),
    });

    // assert
    expect(
      screen.getByRole("button", {
        name: "Safety screening needs a look: 1 yes answer",
      }),
    ).toBeInTheDocument();
  });

  it("names a manual screening", async () => {
    // arrange, act
    await renderPanel({
      review: reviewView({
        ...SUBMITTED,
        screening: { outcome: "manual", yesCount: 0 },
      }),
    });

    // assert
    expect(
      screen.getByRole("button", {
        name: "Safety screening: manual screening (age)",
      }),
    ).toBeInTheDocument();
  });

  it("joins the screening and nutrition warnings", async () => {
    // arrange, act
    await renderPanel({
      review: reviewView({
        ...SUBMITTED,
        screening: { outcome: "needs-review", yesCount: 2 },
        withholdsNutritionAdvice: true,
      }),
    });

    // assert
    expect(
      screen.getByRole("button", {
        name: "Safety screening needs a look: 2 yes answers. Nutrition advice on hold",
      }),
    ).toBeInTheDocument();
  });

  it("shows no signal when nothing needs a look", async () => {
    // arrange, act
    await renderPanel({ review: reviewView(SUBMITTED) });

    // assert
    expect(
      screen.queryByRole("button", {
        name: /needs a look|manual screening|nutrition advice/i,
      }),
    ).not.toBeInTheDocument();
  });
});

describe("the onboarding facts", () => {
  it("reads the ratio from her latest measurement and her chosen check-in", async () => {
    // arrange, act
    await renderPanel({ review: reviewView(SUBMITTED) });

    // assert
    expect(screen.getByText("0.45")).toBeInTheDocument();
    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Phase-based")).toBeInTheDocument();
  });

  it("hides the ratio during pregnancy", async () => {
    // arrange, act
    await renderPanel({
      review: reviewView({ ...SUBMITTED, pregnancyContext: true }),
    });

    // assert
    expect(
      screen.getByText("Not shown during pregnancy or right after birth."),
    ).toBeInTheDocument();
  });

  it("waits on her first measurements", async () => {
    // arrange, act
    await renderPanel({
      review: { ...reviewView(SUBMITTED), measurements: [] },
    });

    // assert
    expect(
      screen.getByText("Waiting on her first measurements"),
    ).toBeInTheDocument();
  });

  it("says what she has not chosen or answered yet", async () => {
    // arrange, act
    await renderPanel({
      review: reviewView({
        ...SUBMITTED,
        checkInChannel: null,
        checkInDay: null,
        cycleMode: null,
      }),
    });

    // assert
    expect(screen.getAllByText("Not chosen yet")).toHaveLength(2);
    expect(screen.getByText("Not answered yet")).toBeInTheDocument();
  });

  it.each([
    ["a man", "male"],
    ["a client who preferred not to say", "prefer_not_to_say"],
  ] as const)(
    "leaves cycle mode out of the facts for %s",
    async (_who, gender) => {
      // arrange, act
      await renderPanel({ review: reviewView(SUBMITTED) }, withGender(gender));

      // assert
      expect(screen.queryByText("Cycle mode")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "What cycle mode means" }),
      ).not.toBeInTheDocument();
    },
  );
});

const PHASE_BASED_FOR_HER =
  "Phase-based — her program follows her cycle phases: she gets a period, is not on the combined pill, is not pregnant, postpartum or breastfeeding, and is not in perimenopause or menopause.";

function cycleModeInfoButton(): HTMLElement {
  return screen.getByRole("button", { name: "What cycle mode means" });
}

describe("the cycle mode explanation", () => {
  it("sits beside the cycle mode label", async () => {
    // arrange, act
    await renderPanel({ review: reviewView(SUBMITTED) });

    // assert
    expect(screen.getByText("Cycle mode")).toContainElement(
      cycleModeInfoButton(),
    );
  });

  it("explains every cycle mode on hover", async () => {
    // arrange
    const user = await renderPanel({ review: reviewView(SUBMITTED) });

    // act
    await user.hover(cycleModeInfoButton());

    // assert
    const hint = await screen.findByRole("dialog");
    expect(hint).toHaveTextContent(PHASE_BASED_FOR_HER);
    expect(hint).toHaveTextContent(
      "Symptom-based — one of those does not hold, so her program follows the symptoms she reports.",
    );
    expect(hint).toHaveTextContent(
      "Set by Eli — her contraception is one the product does not classify; you decide how her program adapts.",
    );
    expect(hint).toHaveTextContent(
      "Not answered yet — the cycle form is empty.",
    );
  });

  it("explains the cycle modes when the info button takes keyboard focus", async () => {
    // arrange
    const user = await renderPanel({ review: reviewView(SUBMITTED) });

    // act
    await user.tab();

    // assert
    expect(cycleModeInfoButton()).toHaveFocus();
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      PHASE_BASED_FOR_HER,
    );
  });
});

describe("the panel for a client who is not a woman", () => {
  it("says his answers are not in while he has not submitted", async () => {
    // arrange, act
    await renderPanel({ review: reviewView(null) }, withGender("male"));

    // assert
    expect(screen.getByText("His answers are not in yet.")).toBeInTheDocument();
  });

  it("says their answers are not in while they have not submitted", async () => {
    // arrange, act
    await renderPanel(
      { review: reviewView(null) },
      withGender("prefer_not_to_say"),
    );

    // assert
    expect(
      screen.getByText("Their answers are not in yet."),
    ).toBeInTheDocument();
  });

  it("waits on his first measurements", async () => {
    // arrange, act
    await renderPanel(
      { review: { ...reviewView(SUBMITTED), measurements: [] } },
      withGender("male"),
    );

    // assert
    expect(
      screen.getByText("Waiting on his first measurements"),
    ).toBeInTheDocument();
  });

  it("waits on their first measurements", async () => {
    // arrange, act
    await renderPanel(
      { review: { ...reviewView(SUBMITTED), measurements: [] } },
      withGender("prefer_not_to_say"),
    );

    // assert
    expect(
      screen.getByText("Waiting on their first measurements"),
    ).toBeInTheDocument();
  });

  it("asks which answers the coach wants him to revisit", async () => {
    // arrange
    const user = await renderPanel(
      { review: reviewView(submittedReviewIn("in-review")) },
      withGender("male"),
    );

    // act
    await user.click(screen.getByRole("button", { name: "Continue review" }));

    // assert
    expect(
      screen.getByRole("dialog", {
        description:
          "Tick any answer you want him to revisit, then approve or ask for more details.",
        name: "Review Ana’s answers",
      }),
    ).toBeInTheDocument();
  });

  it("asks which answers the coach wants them to revisit", async () => {
    // arrange
    const user = await renderPanel(
      { review: reviewView(submittedReviewIn("in-review")) },
      withGender("prefer_not_to_say"),
    );

    // act
    await user.click(screen.getByRole("button", { name: "Continue review" }));

    // assert
    expect(
      screen.getByRole("dialog", {
        description:
          "Tick any answer you want them to revisit, then approve or ask for more details.",
        name: "Review Ana’s answers",
      }),
    ).toBeInTheDocument();
  });
});

describe("the answers in the panel", () => {
  it("marks an answer that needs a look and one left unanswered", async () => {
    // arrange
    const user = await renderPanel({ review: reviewView(SUBMITTED) });

    // act
    await user.click(
      screen.getByRole("button", { name: /^Goals and availability/ }),
    );
    await user.click(screen.getByRole("button", { name: /^Safety screening/ }));

    // assert
    expect(
      screen.getByRole("button", { name: /^Goals and availability/ }),
    ).toHaveTextContent("2 of 3 answered");
    expect(
      screen.getByRole("img", { name: "Needs a look" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Not answered")).toBeInTheDocument();
  });
});

describe("reviewing her answers", () => {
  it("opens the review when it starts from answers awaiting review", async () => {
    // arrange
    const openings = recordRequests(
      CLIENT_ONBOARDING_API_PATHS.reviewOpenings,
      HttpResponse.json({ outcome: "opened" }),
    );
    const loaded = { review: reviewView(submittedReviewIn("awaiting-review")) };
    const user = await renderPanel(loaded);
    loaded.review = reviewView(submittedReviewIn("in-review"));

    // act
    await user.click(screen.getByRole("button", { name: "Review answers" }));

    // assert
    const dialog = screen.getByRole("dialog", {
      name: "Review Ana’s answers",
    });
    expect(
      within(dialog).getByText(
        "Tick any answer you want her to revisit, then approve or ask for more details.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(openings).toEqual([{ clientId: CLIENT_ID }]);
    });
    expect(
      await within(dialog).findByRole("button", { name: "Approve answers" }),
    ).toBeInTheDocument();
  });

  it("does not reopen a review already in progress", async () => {
    // arrange
    const openings = recordRequests(
      CLIENT_ONBOARDING_API_PATHS.reviewOpenings,
      HttpResponse.json({ outcome: "already-open" }),
    );
    const user = await renderPanel({
      review: reviewView(submittedReviewIn("in-review")),
    });

    // act
    await user.click(screen.getByRole("button", { name: "Continue review" }));

    // assert
    expect(
      screen.getByRole("dialog", { name: "Review Ana’s answers" }),
    ).toBeInTheDocument();
    expect(openings).toEqual([]);
  });

  it("asks for details only with a flagged question and a note", async () => {
    // arrange
    const user = await openReview();
    const dialog = screen.getByRole("dialog");
    const askButton = within(dialog).getByRole("button", {
      name: "Ask for more details",
    });

    // act
    await user.click(
      within(dialog).getByRole("checkbox", { name: "Flag Primary goal" }),
    );
    await user.type(
      within(dialog).getByRole("textbox", { name: "What is missing?" }),
      "   ",
    );

    // assert
    expect(askButton).toBeDisabled();
    await user.type(
      within(dialog).getByRole("textbox", { name: "What is missing?" }),
      "More, please",
    );
    expect(askButton).toBeEnabled();
  });

  it("counts the flagged questions", async () => {
    // arrange
    const user = await openReview();
    const dialog = screen.getByRole("dialog");

    // act
    await user.click(
      within(dialog).getByRole("checkbox", { name: "Flag Primary goal" }),
    );

    // assert
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "1 question flagged",
    );
    await user.click(
      within(dialog).getByRole("checkbox", { name: "Flag Heart condition" }),
    );
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "2 questions flagged",
    );
  });

  it("sends the flagged questions with the note and confirms the email", async () => {
    // arrange
    const requests = recordRequests(
      CLIENT_ONBOARDING_API_PATHS.detailRequests,
      HttpResponse.json({ outcome: "requested" }),
    );
    const loaded = { review: reviewView(submittedReviewIn("in-review")) };
    const user = await openReview(loaded);
    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("checkbox", { name: "Flag Heart condition" }),
    );
    await user.type(
      within(dialog).getByRole("textbox", { name: "What is missing?" }),
      "  Tell me more about your heart.  ",
    );
    loaded.review = reviewView({
      ...submittedReviewIn("needs-details"),
      openRequest: OPEN_REQUEST,
    });

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Ask for more details" }),
    );

    // assert
    expect(
      await screen.findByText("Email sent to ana@example.com."),
    ).toBeInTheDocument();
    expect(requests).toEqual([
      {
        clientId: CLIENT_ID,
        note: "Tell me more about your heart.",
        questions: [{ fieldId: "heart-condition", formId: "safety-screening" }],
      },
    ]);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      await screen.findByText("Waiting on 2 answers · asked 28 September"),
    ).toBeInTheDocument();
  });

  it("keeps the review open when the request is refused", async () => {
    // arrange
    recordRequests(
      CLIENT_ONBOARDING_API_PATHS.detailRequests,
      HttpResponse.json({ error: "not-in-review" }, { status: 409 }),
    );
    const user = await openReview();
    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("checkbox", { name: "Flag Primary goal" }),
    );
    await user.type(
      within(dialog).getByRole("textbox", { name: "What is missing?" }),
      "More, please",
    );

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Ask for more details" }),
    );

    // assert
    expect(
      await screen.findByText(
        "That did not go through just now. Try again in a moment.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Review Ana’s answers" }),
    ).toBeInTheDocument();
  });

  it("confirms an approval from the review over the open review", async () => {
    // arrange
    const approvals = recordRequests(
      CLIENT_ONBOARDING_API_PATHS.approvals,
      HttpResponse.json({ outcome: "approved" }),
    );
    const loaded = { review: reviewView(submittedReviewIn("in-review")) };
    const user = await openReview(loaded);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Approve answers",
      }),
    );
    loaded.review = reviewView(submittedReviewIn("approved"));

    // act
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Approve Ana's answers?" }),
      ).getByRole("button", { name: "Approve" }),
    );

    // assert
    await waitFor(() => {
      expect(approvals).toEqual([{ clientId: CLIENT_ID }]);
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: "Continue review" }),
    ).not.toBeInTheDocument();
  });

  it("returns to the review when the approval is cancelled", async () => {
    // arrange
    const approvals = recordRequests(
      CLIENT_ONBOARDING_API_PATHS.approvals,
      HttpResponse.json({ outcome: "approved" }),
    );
    const user = await openReview();
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Approve answers",
      }),
    );

    // act
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Approve Ana's answers?" }),
      ).getByRole("button", { name: "Cancel" }),
    );

    // assert
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Approve Ana's answers?" }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("dialog", { name: "Review Ana’s answers" }),
    ).toBeInTheDocument();
    expect(approvals).toEqual([]);
  });

  it("approves from the panel after a confirmation", async () => {
    // arrange
    const approvals = recordRequests(
      CLIENT_ONBOARDING_API_PATHS.approvals,
      HttpResponse.json({ outcome: "approved" }),
    );
    const loaded = { review: reviewView(submittedReviewIn("awaiting-review")) };
    const user = await renderPanel(loaded);
    await user.click(screen.getByRole("button", { name: "Approve answers" }));
    loaded.review = reviewView(submittedReviewIn("approved"));

    // act
    await user.click(screen.getByRole("button", { name: "Approve" }));

    // assert
    await waitFor(() => {
      expect(approvals).toEqual([{ clientId: CLIENT_ID }]);
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Approve answers" }),
      ).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("returns focus to the review action when the review closes", async () => {
    // arrange
    const user = await openReview();

    // act
    await user.keyboard("{Escape}");

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Continue review" }),
    ).toHaveFocus();
  });
});

function submittedReviewIn(stage: ReviewStage): SubmittedReview {
  return { ...SUBMITTED, stage };
}

function withGender(gender: ReviewedClient["gender"]) {
  return { ...CLIENT, gender };
}

function reviewView(submitted: SubmittedReview | null): OnboardingReviewView {
  return {
    clientId: CLIENT_ID,
    measurements: MEASUREMENTS,
    statedHeightCm: 170,
    submitted,
  };
}

function recordRequests(path: string, response: Response): unknown[] {
  const requests: unknown[] = [];

  server.use(
    http.post(path, async ({ request }) => {
      requests.push(await request.json());

      return response.clone();
    }),
  );

  return requests;
}

async function openReview(
  loaded = { review: reviewView(submittedReviewIn("in-review")) },
) {
  const user = await renderPanel(loaded);
  await user.click(screen.getByRole("button", { name: "Continue review" }));

  return user;
}

async function renderPanel(
  loaded: { review: OnboardingReviewView },
  client: ReviewedClient = CLIENT,
) {
  const user = userEvent.setup();
  const PanelRoute = () => {
    const review = useLoaderData<OnboardingReviewView>();

    return (
      <>
        <OnboardingPanel
          client={client}
          review={review}
          statusBadge={<span>{STATUS_BADGE}</span>}
        />
        <Toaster />
      </>
    );
  };
  const forwardToServer = ({ request }: { request: Request }) => fetch(request);
  const router = createMemoryRouter(
    [
      {
        Component: PanelRoute,
        loader: () => loaded.review,
        path: PAGE_PATH,
      },
      {
        action: forwardToServer,
        path: CLIENT_ONBOARDING_API_PATHS.reviewOpenings,
      },
      {
        action: forwardToServer,
        path: CLIENT_ONBOARDING_API_PATHS.detailRequests,
      },
      {
        action: forwardToServer,
        path: CLIENT_ONBOARDING_API_PATHS.approvals,
      },
    ],
    { initialEntries: [PAGE_PATH] },
  );

  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { level: 2, name: "Onboarding" });

  return user;
}
