import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import {
  DetailRequest,
  emptyDraft,
  type ApproveOnboardingAnswersUseCase,
  type OnboardingAnswersByForm,
  type OpenOnboardingReviewUseCase,
  type ReadOnboardingReviewUseCase,
  type RequestOnboardingDetailsUseCase,
} from "@eli-coach-platform/domain/client-onboarding";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/features/accounts/server/accounts-composition.server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import {
  sessionContext,
  type ResolvedSession,
} from "~/features/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { OnboardingReviewController } from "./onboarding-review-controller.server";

const NOW = new Date("2026-09-29T10:00:00.000Z");
const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const REQUEST_ID = "0b5f2f0e-3a1c-4c47-9a57-8f2d7f1e6a01";
const SUBMITTED_AT = new Date("2026-09-28T09:00:00.000Z");
const ASKED_AT = new Date("2026-09-29T09:30:00.000Z");
const FIRST_RECORDED_AT = new Date("2026-09-28T09:00:00.000Z");
const SECOND_RECORDED_AT = new Date("2026-09-29T08:00:00.000Z");

const COACH: AccountSnapshot = {
  authSubjectId: "user_eli",
  id: "acct_eli",
  role: "COACH",
};

const CLIENT_SESSION: ResolvedSession = {
  account: { ...COACH, role: "CLIENT" },
  kind: "authenticated",
};

const ANONYMOUS_SESSION: ResolvedSession = { kind: "anonymous" };

type ReadResult = Awaited<ReturnType<ReadOnboardingReviewUseCase["execute"]>>;
type SubmittedReading = Extract<ReadResult, { status: "submitted" }>;
type OpenResult = Awaited<ReturnType<OpenOnboardingReviewUseCase["execute"]>>;
type RequestResult = Awaited<
  ReturnType<RequestOnboardingDetailsUseCase["execute"]>
>;
type ApproveResult = Awaited<
  ReturnType<ApproveOnboardingAnswersUseCase["execute"]>
>;

describe("OnboardingReviewController loadReview", () => {
  it("hands the coach the submitted review with labelled, unit-suffixed and flagged answers", async () => {
    // arrange
    const openRequest = DetailRequest.raise({
      id: REQUEST_ID,
      clientId: CLIENT_ID,
      questionIds: [
        { formId: "goal-availability", fieldId: "weight" },
        { formId: "nutrition-lifestyle", fieldId: "checkInDay" },
      ],
      note: "Your weight and check-in day look off.",
      askedAt: ASKED_AT,
    }).toSnapshot();
    const { controller, readOnboardingReview } = createController({
      reading: submittedReading({
        answers: answersWith({
          "goal-availability": {
            weight: 66.1,
            height: 165,
            goalWeight: 60,
            primaryGoal: "Lose fat",
            blockers: ["Busy schedule", "Something else"],
            additionalInfo: null,
          },
          "safety-screening": { chestPainOnExertion: "Yes" },
          "cycle-context": { cycleLengthMin: 29 },
          "nutrition-lifestyle": {
            checkInDay: "Friday",
            checkInChannel: "WhatsApp",
          },
          measurements: { waist: 74 },
        }),
        overrides: {
          stage: "needs-details",
          screening: { outcome: "needs-review", yesCount: 1 },
          withholdsNutritionAdvice: true,
          pregnancyContext: false,
          cycleMode: "phase-based",
          flaggedQuestions: [
            { formId: "safety-screening", fieldId: "chestPainOnExertion" },
          ],
          forms: [
            {
              formId: "goal-availability",
              fieldIds: [
                "weight",
                "height",
                "goalWeight",
                "primaryGoal",
                "blockers",
                "additionalInfo",
              ],
              answered: 5,
              total: 6,
            },
            {
              formId: "safety-screening",
              fieldIds: ["chestPainOnExertion"],
              answered: 1,
              total: 1,
            },
            {
              formId: "cycle-context",
              fieldIds: ["cycleLengthMin"],
              answered: 1,
              total: 1,
            },
            {
              formId: "nutrition-lifestyle",
              fieldIds: ["checkInDay", "checkInChannel"],
              answered: 2,
              total: 2,
            },
            {
              formId: "measurements",
              fieldIds: ["waist"],
              answered: 1,
              total: 1,
            },
          ],
          openRequest,
          requests: [openRequest],
          measurements: [
            { recordedAt: FIRST_RECORDED_AT, weightKg: 66.1, waistCm: 74 },
            {
              recordedAt: SECOND_RECORDED_AT,
              weightKg: 65.4,
              waistCm: 73,
              hipsCm: 96.5,
              thighCm: 55,
              armCm: 28.5,
            },
          ],
          statedHeightCm: 165,
        },
      }),
    });

    // act
    const review = await controller.loadReview(coachArgs(), CLIENT_ID);

    // assert
    expect(readOnboardingReview).toHaveBeenCalledWith(CLIENT_ID);
    expect(review).toEqual({
      clientId: CLIENT_ID,
      submitted: {
        stage: "needs-details",
        screening: { outcome: "needs-review", yesCount: 1 },
        withholdsNutritionAdvice: true,
        pregnancyContext: false,
        cycleMode: "phase-based",
        checkInDay: "Friday",
        checkInChannel: "WhatsApp",
        forms: [
          {
            formId: "goal-availability",
            title: "Your goal and your week",
            answered: 5,
            total: 6,
            answers: [
              answer("weight", "Weight", "66.1 kg"),
              answer("height", "Height", "165 cm"),
              answer("goalWeight", "Target weight", "60 kg"),
              answer("primaryGoal", "Primary goal", "Lose fat"),
              answer("blockers", "Blockers", "Busy schedule, Something else"),
              answer("additionalInfo", "Additional info", null),
            ],
          },
          {
            formId: "safety-screening",
            title: "A few safety questions",
            answered: 1,
            total: 1,
            answers: [
              answer("chestPainOnExertion", "Chest pain on exertion", "Yes", {
                flagged: true,
              }),
            ],
          },
          {
            formId: "cycle-context",
            title: "Your cycle and hormonal health",
            answered: 1,
            total: 1,
            answers: [answer("cycleLengthMin", "Cycle length min", "29 days")],
          },
          {
            formId: "nutrition-lifestyle",
            title: "Food and daily life",
            answered: 2,
            total: 2,
            answers: [
              answer("checkInDay", "Check in day", "Friday"),
              answer("checkInChannel", "Check in channel", "WhatsApp"),
            ],
          },
          {
            formId: "measurements",
            title: "Your measurements",
            answered: 1,
            total: 1,
            answers: [answer("waist", "Waist", "74 cm")],
          },
        ],
        openRequest: {
          note: "Your weight and check-in day look off.",
          askedAt: "2026-09-29T09:30:00.000Z",
          questions: [
            { formId: "goal-availability", fieldId: "weight" },
            { formId: "nutrition-lifestyle", fieldId: "checkInDay" },
          ],
        },
      },
      measurements: [
        {
          recordedAt: "2026-09-28T09:00:00.000Z",
          weightKg: 66.1,
          waistCm: 74,
          hipsCm: null,
          thighCm: null,
          armCm: null,
        },
        {
          recordedAt: "2026-09-29T08:00:00.000Z",
          weightKg: 65.4,
          waistCm: 73,
          hipsCm: 96.5,
          thighCm: 55,
          armCm: 28.5,
        },
      ],
      statedHeightCm: 165,
    });
  });

  it("answers no check-in day, no channel and no open request when the client gave none", async () => {
    // arrange
    const { controller } = createController({
      reading: submittedReading({
        answers: answersWith({}),
        overrides: { cycleMode: null, openRequest: null },
      }),
    });

    // act
    const review = await controller.loadReview(coachArgs(), CLIENT_ID);

    // assert
    expect(review.submitted).toMatchObject({
      cycleMode: null,
      checkInDay: null,
      checkInChannel: null,
      forms: [],
      openRequest: null,
    });
  });

  it("answers unanswered questions with no value, and a ticked box as yes", async () => {
    // arrange
    const { controller } = createController({
      reading: submittedReading({
        answers: answersWith({
          "goal-availability": { blockers: [], additionalInfo: "  " },
          "safety-screening": { parqDeclaration: true },
        }),
        overrides: {
          forms: [
            {
              formId: "goal-availability",
              fieldIds: ["blockers", "additionalInfo", "coachExpectations"],
              answered: 0,
              total: 3,
            },
            {
              formId: "safety-screening",
              fieldIds: ["parqDeclaration"],
              answered: 1,
              total: 1,
            },
          ],
        },
      }),
    });

    // act
    const review = await controller.loadReview(coachArgs(), CLIENT_ID);

    // assert
    expect(
      review.submitted?.forms.map((form) =>
        form.answers.map((given) => given.value),
      ),
    ).toEqual([[null, null, null], ["Yes"]]);
  });

  it("answers no submission, no measurements and no height before the client has submitted", async () => {
    // arrange
    const { controller } = createController({
      reading: { status: "not-submitted" },
    });

    // act
    const review = await controller.loadReview(coachArgs(), CLIENT_ID);

    // assert
    expect(review).toEqual({
      clientId: CLIENT_ID,
      submitted: null,
      measurements: [],
      statedHeightCm: null,
    });
  });

  it("answers not found when the client does not exist", async () => {
    // arrange
    const { controller } = createController({
      reading: { status: "not-found" },
    });

    // act
    const thrown = await captureThrown(() =>
      controller.loadReview(coachArgs(), CLIENT_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("answers not found to an id that is not a uuid without reading any review", async () => {
    // arrange
    const { controller, readOnboardingReview } = createController({
      reading: { status: "not-submitted" },
    });

    // act
    const thrown = await captureThrown(() =>
      controller.loadReview(coachArgs(), "not-a-uuid"),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
    expect(readOnboardingReview).not.toHaveBeenCalled();
  });

  it("refuses a client account without reading any review", async () => {
    // arrange
    const { controller, readOnboardingReview } = createController({
      reading: { status: "not-submitted" },
    });

    // act
    const thrown = await captureThrown(() =>
      controller.loadReview(coachArgs({ session: CLIENT_SESSION }), CLIENT_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(readOnboardingReview).not.toHaveBeenCalled();
  });

  it("sends an anonymous visitor to sign in without reading any review", async () => {
    // arrange
    const { controller, readOnboardingReview } = createController({
      reading: { status: "not-submitted" },
    });

    // act
    const thrown = await captureThrown(() =>
      controller.loadReview(
        coachArgs({ session: ANONYMOUS_SESSION }),
        CLIENT_ID,
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(302);
    expect(readOnboardingReview).not.toHaveBeenCalled();
  });
});

describe("OnboardingReviewController openReview", () => {
  it.each<[OpenResult, string]>([
    [{ status: "opened" }, "opened"],
    [{ status: "already-open" }, "already-open"],
  ])("accepts an opening the use case answers %j", async (result, outcome) => {
    // arrange
    const { controller, openOnboardingReview } = createController({
      openResult: result,
    });

    // act
    const response = await controller.openReview(actionArgs(targetBody()));

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ outcome });
    expect(openOnboardingReview).toHaveBeenCalledWith(CLIENT_ID);
  });

  it.each<[OpenResult, number]>([
    [{ status: "not-found" }, 404],
    [{ status: "not-submitted" }, 409],
    [{ status: "approved" }, 409],
  ])("refuses an opening the use case answers %j", async (result, status) => {
    // arrange
    const { controller } = createController({ openResult: result });

    // act
    const response = await controller.openReview(actionArgs(targetBody()));

    // assert
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: result.status });
  });

  it("answers 400 to a body it cannot read without opening any review", async () => {
    // arrange
    const { controller, openOnboardingReview } = createController({
      openResult: { status: "opened" },
    });

    // act
    const responses = await Promise.all(
      unreadableTargetBodies().map((body) =>
        controller.openReview(actionArgs(body)),
      ),
    );

    // assert
    expect(responses.map((response) => response.status)).toEqual([400, 400]);
    expect(openOnboardingReview).not.toHaveBeenCalled();
  });

  it.each([
    ["a client account", CLIENT_SESSION, 403],
    ["an anonymous visitor", ANONYMOUS_SESSION, 401],
  ])(
    "refuses %s without opening any review",
    async (_label, session, status) => {
      // arrange
      const { controller, openOnboardingReview } = createController({
        openResult: { status: "opened" },
      });

      // act
      const thrown = await captureThrown(() =>
        controller.openReview(actionArgs(targetBody(), session)),
      );

      // assert
      expect((thrown as Response).status).toBe(status);
      expect(openOnboardingReview).not.toHaveBeenCalled();
    },
  );
});

describe("OnboardingReviewController requestDetails", () => {
  it("accepts the request and hands the use case the client, the questions and the note", async () => {
    // arrange
    const { controller, requestOnboardingDetails } = createController({
      requestResult: { status: "requested" },
    });

    // act
    const response = await controller.requestDetails(actionArgs(detailsBody()));

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ outcome: "requested" });
    expect(requestOnboardingDetails).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      questionIds: [
        { formId: "goal-availability", fieldId: "weight" },
        { formId: "nutrition-lifestyle", fieldId: "checkInDay" },
      ],
      note: "Please check these two.",
    });
  });

  it.each<[RequestResult, number, string]>([
    [{ status: "not-found" }, 404, "not-found"],
    [{ status: "not-in-review" }, 409, "not-in-review"],
    [{ status: "invalid", reason: "empty-note" }, 422, "invalid"],
  ])(
    "refuses a request the use case answers %j",
    async (result, status, error) => {
      // arrange
      const { controller } = createController({ requestResult: result });

      // act
      const response = await controller.requestDetails(
        actionArgs(detailsBody()),
      );

      // assert
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error });
    },
  );

  it("answers 400 to a body it cannot read without requesting anything", async () => {
    // arrange
    const { controller, requestOnboardingDetails } = createController({
      requestResult: { status: "requested" },
    });
    const bodies = [
      "{",
      detailsBody({ clientId: "not-a-uuid" }),
      detailsBody({ note: "a".repeat(2001) }),
    ];

    // act
    const responses = await Promise.all(
      bodies.map((body) => controller.requestDetails(actionArgs(body))),
    );

    // assert
    expect(responses.map((response) => response.status)).toEqual([
      400, 400, 400,
    ]);
    expect(requestOnboardingDetails).not.toHaveBeenCalled();
  });

  it.each([
    ["a client account", CLIENT_SESSION, 403],
    ["an anonymous visitor", ANONYMOUS_SESSION, 401],
  ])(
    "refuses %s without requesting anything",
    async (_label, session, status) => {
      // arrange
      const { controller, requestOnboardingDetails } = createController({
        requestResult: { status: "requested" },
      });

      // act
      const thrown = await captureThrown(() =>
        controller.requestDetails(actionArgs(detailsBody(), session)),
      );

      // assert
      expect((thrown as Response).status).toBe(status);
      expect(requestOnboardingDetails).not.toHaveBeenCalled();
    },
  );
});

describe("OnboardingReviewController approveAnswers", () => {
  it("accepts the approval", async () => {
    // arrange
    const { controller, approveOnboardingAnswers } = createController({
      approveResult: { status: "approved" },
    });

    // act
    const response = await controller.approveAnswers(actionArgs(targetBody()));

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ outcome: "approved" });
    expect(approveOnboardingAnswers).toHaveBeenCalledWith(CLIENT_ID);
  });

  it.each<[ApproveResult, number]>([
    [{ status: "not-found" }, 404],
    [{ status: "not-reviewable" }, 409],
  ])("refuses an approval the use case answers %j", async (result, status) => {
    // arrange
    const { controller } = createController({ approveResult: result });

    // act
    const response = await controller.approveAnswers(actionArgs(targetBody()));

    // assert
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: result.status });
  });

  it("answers 400 to a body it cannot read without approving anything", async () => {
    // arrange
    const { controller, approveOnboardingAnswers } = createController({
      approveResult: { status: "approved" },
    });

    // act
    const responses = await Promise.all(
      unreadableTargetBodies().map((body) =>
        controller.approveAnswers(actionArgs(body)),
      ),
    );

    // assert
    expect(responses.map((response) => response.status)).toEqual([400, 400]);
    expect(approveOnboardingAnswers).not.toHaveBeenCalled();
  });

  it.each([
    ["a client account", CLIENT_SESSION, 403],
    ["an anonymous visitor", ANONYMOUS_SESSION, 401],
  ])(
    "refuses %s without approving anything",
    async (_label, session, status) => {
      // arrange
      const { controller, approveOnboardingAnswers } = createController({
        approveResult: { status: "approved" },
      });

      // act
      const thrown = await captureThrown(() =>
        controller.approveAnswers(actionArgs(targetBody(), session)),
      );

      // assert
      expect((thrown as Response).status).toBe(status);
      expect(approveOnboardingAnswers).not.toHaveBeenCalled();
    },
  );
});

function answer(
  fieldId: string,
  label: string,
  value: string | null,
  options: { flagged?: boolean } = {},
) {
  return { fieldId, label, value, flagged: options.flagged ?? false };
}

function answersWith(
  overrides: Partial<OnboardingAnswersByForm>,
): OnboardingAnswersByForm {
  return { ...emptyDraft(NOW).answers, ...overrides };
}

function submittedReading(options: {
  answers: OnboardingAnswersByForm;
  overrides?: Partial<SubmittedReading>;
}): SubmittedReading {
  return {
    status: "submitted",
    stage: "in-review",
    submission: {
      answers: options.answers,
      consents: {
        specialCategoryAt: SUBMITTED_AT,
        disclaimerAt: SUBMITTED_AT,
        progressPhotosAt: null,
      },
      submittedAt: SUBMITTED_AT,
    },
    screening: { outcome: "cleared", yesCount: 0 },
    withholdsNutritionAdvice: false,
    pregnancyContext: false,
    cycleMode: "not-applicable",
    flaggedQuestions: [],
    forms: [],
    openRequest: null,
    requests: [],
    measurements: [],
    statedHeightCm: null,
    ...options.overrides,
  };
}

function targetBody(): string {
  return JSON.stringify({ clientId: CLIENT_ID });
}

function unreadableTargetBodies(): string[] {
  return ["{", JSON.stringify({ clientId: "not-a-uuid" })];
}

function detailsBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    clientId: CLIENT_ID,
    questions: [
      { formId: "goal-availability", fieldId: "weight" },
      { formId: "nutrition-lifestyle", fieldId: "checkInDay" },
    ],
    note: "Please check these two.",
    ...overrides,
  });
}

function createController(
  options: {
    approveResult?: ApproveResult;
    openResult?: OpenResult;
    reading?: ReadResult;
    requestResult?: RequestResult;
  } = {},
) {
  const approveOnboardingAnswers = vi
    .fn()
    .mockResolvedValue(options.approveResult);
  const openOnboardingReview = vi.fn().mockResolvedValue(options.openResult);
  const readOnboardingReview = vi.fn().mockResolvedValue(options.reading);
  const requestOnboardingDetails = vi
    .fn()
    .mockResolvedValue(options.requestResult);
  const controller = new OnboardingReviewController({
    approveOnboardingAnswers: {
      execute: approveOnboardingAnswers,
    } as unknown as ApproveOnboardingAnswersUseCase,
    openOnboardingReview: {
      execute: openOnboardingReview,
    } as unknown as OpenOnboardingReviewUseCase,
    readOnboardingReview: {
      execute: readOnboardingReview,
    } as unknown as ReadOnboardingReviewUseCase,
    requestOnboardingDetails: {
      execute: requestOnboardingDetails,
    } as unknown as RequestOnboardingDetailsUseCase,
  });

  return {
    approveOnboardingAnswers,
    controller,
    openOnboardingReview,
    readOnboardingReview,
    requestOnboardingDetails,
  };
}

function coachArgs(options: { session?: ResolvedSession } = {}) {
  return createRequestArgs({
    contexts: sessionContexts(options.session),
    request: new Request(`https://evoa.fit/coach/clients/${CLIENT_ID}`),
  });
}

function actionArgs(body: string, session?: ResolvedSession) {
  return createRequestArgs({
    contexts: sessionContexts(session),
    request: new Request("https://evoa.fit/api/onboarding-review", {
      body,
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  });
}

function sessionContexts(session?: ResolvedSession) {
  const accounts = {
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
  } as unknown as AccountsFeature;

  return [
    contextEntry(accountsContext, accounts),
    contextEntry(
      sessionContext,
      session ?? { account: COACH, kind: "authenticated" },
    ),
  ];
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}
