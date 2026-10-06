import { describe, expect, it } from "vitest";

import type { MeasureUnits } from "../unit-preference";
import { DetailRequest } from "./detail-request";
import {
  emptyAnswers,
  type OnboardingAnswersByForm,
} from "./onboarding-answers";
import type { OnboardingClient } from "./onboarding-clients";
import { OnboardingReview, reviewStageOf } from "./onboarding-review";
import type { ReviewStamps } from "./onboarding-review-stamps";
import type { OnboardingSubmission } from "./onboarding-submission";

const SUBMITTED_AT = new Date("2026-09-27T10:00:00.000Z");
const OPENED_AT = new Date("2026-09-28T09:00:00.000Z");
const ASKED_AT = new Date("2026-09-28T10:00:00.000Z");
const ANSWERED_AT = new Date("2026-09-29T10:00:00.000Z");
const NOW = new Date("2026-09-30T10:00:00.000Z");
const METRIC: MeasureUnits = { weight: "kg", length: "cm" };
const WEIGHT = { formId: "goal-availability", fieldId: "weight" } as const;
const GOAL_WEIGHT = {
  formId: "goal-availability",
  fieldId: "goalWeight",
} as const;

const NO_STAMPS: ReviewStamps = {
  reviewOpenedAt: null,
  detailsRequestedAt: null,
  detailsAnsweredAt: null,
  answersApprovedAt: null,
};

const CLIENT: OnboardingClient = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  country: "RO",
  phone: "+40712345678",
  email: "ana@example.com",
  gender: "female",
  dateOfBirth: "1994-03-14",
  submittedAt: SUBMITTED_AT,
  reviewStamps: NO_STAMPS,
  subscriptionCancelledOrEnded: false,
};

function submittedAnswers(): OnboardingAnswersByForm {
  return {
    ...emptyAnswers(),
    "goal-availability": { weight: 70, height: 168, goalWeight: 65 },
    "safety-screening": { heartCondition: "No", parqDeclaration: true },
  };
}

function submission(): OnboardingSubmission {
  return {
    answers: submittedAnswers(),
    consents: {
      specialCategoryAt: SUBMITTED_AT,
      disclaimerAt: SUBMITTED_AT,
      progressPhotosAt: null,
    },
    submittedAt: SUBMITTED_AT,
  };
}

function request(
  overrides: Partial<Parameters<typeof DetailRequest.reconstitute>[0]> = {},
): DetailRequest {
  return DetailRequest.reconstitute({
    id: "request-1",
    clientId: CLIENT.clientId,
    questionIds: [WEIGHT],
    note: "Please weigh yourself in the morning.",
    askedAt: ASKED_AT,
    answeredAt: null,
    ...overrides,
  });
}

function review(
  overrides: Partial<Parameters<typeof OnboardingReview.reconstitute>[0]> = {},
): OnboardingReview {
  return OnboardingReview.reconstitute({
    client: CLIENT,
    submission: submission(),
    openedAt: null,
    approvedAt: null,
    requests: [],
    ...overrides,
  });
}

describe("reviewStageOf", () => {
  it.each([
    ["no stage before she submits", null, NO_STAMPS, null],
    [
      "awaiting review once submitted",
      SUBMITTED_AT,
      NO_STAMPS,
      "awaiting-review",
    ],
    [
      "in review once opened",
      SUBMITTED_AT,
      { ...NO_STAMPS, reviewOpenedAt: OPENED_AT },
      "in-review",
    ],
    [
      "needs details while a request is unanswered",
      SUBMITTED_AT,
      { ...NO_STAMPS, reviewOpenedAt: OPENED_AT, detailsRequestedAt: ASKED_AT },
      "needs-details",
    ],
    [
      "in review again once she answers",
      SUBMITTED_AT,
      {
        ...NO_STAMPS,
        reviewOpenedAt: OPENED_AT,
        detailsRequestedAt: ASKED_AT,
        detailsAnsweredAt: ANSWERED_AT,
      },
      "in-review",
    ],
    [
      "needs details when the latest request is newer than the last answer",
      SUBMITTED_AT,
      {
        ...NO_STAMPS,
        reviewOpenedAt: OPENED_AT,
        detailsRequestedAt: NOW,
        detailsAnsweredAt: ANSWERED_AT,
      },
      "needs-details",
    ],
    [
      "approved once approved",
      SUBMITTED_AT,
      {
        ...NO_STAMPS,
        reviewOpenedAt: OPENED_AT,
        answersApprovedAt: NOW,
      },
      "approved",
    ],
  ] as const)("is %s", (_label, submittedAt, stamps, expected) => {
    // arrange
    const input = { submittedAt, stamps };

    // act
    const stage = reviewStageOf(input);

    // assert
    expect(stage).toBe(expected);
  });
});

describe("OnboardingReview#stamps", () => {
  it("projects the opened and approved moments and the latest request's asked and answered moments", () => {
    // arrange
    const onboardingReview = review({
      openedAt: OPENED_AT,
      approvedAt: NOW,
      requests: [
        request({ id: "request-2", askedAt: ANSWERED_AT, answeredAt: NOW }),
        request({ answeredAt: ANSWERED_AT }),
      ],
    });

    // act
    const stamps = onboardingReview.stamps();

    // assert
    expect(stamps).toEqual({
      reviewOpenedAt: OPENED_AT,
      detailsRequestedAt: ANSWERED_AT,
      detailsAnsweredAt: NOW,
      answersApprovedAt: NOW,
    });
  });

  it("matches a projection with the same moments and not a lagging one", () => {
    // arrange
    const onboardingReview = review({ openedAt: OPENED_AT });

    // act
    const matchesSame = onboardingReview.matchesStamps({
      ...NO_STAMPS,
      reviewOpenedAt: new Date(OPENED_AT.getTime()),
    });
    const matchesLagging = onboardingReview.matchesStamps(NO_STAMPS);

    // assert
    expect(matchesSame).toBe(true);
    expect(matchesLagging).toBe(false);
  });
});

describe("OnboardingReview#open", () => {
  it("opens a submitted review and moves her to in-review", () => {
    // arrange
    const onboardingReview = review();

    // act
    const outcome = onboardingReview.open(NOW);

    // assert
    expect(outcome.status).toBe("opened");
    if (outcome.status !== "opened") return;
    expect(outcome.review.stage()).toBe("in-review");
    expect(outcome.review.stamps().reviewOpenedAt).toEqual(NOW);
  });

  it.each([
    ["not-submitted", { submission: null }],
    ["already-open", { openedAt: OPENED_AT }],
    ["approved", { openedAt: OPENED_AT, approvedAt: NOW }],
  ] as const)("refuses with %s", (expected, overrides) => {
    // arrange
    const onboardingReview = review(overrides);

    // act
    const outcome = onboardingReview.open(NOW);

    // assert
    expect(outcome).toEqual({ status: expected });
  });
});

describe("OnboardingReview#requestDetails", () => {
  it("raises a request for the flagged questions with the trimmed note and moves her to needs-details", () => {
    // arrange
    const onboardingReview = review({ openedAt: OPENED_AT });

    // act
    const outcome = onboardingReview.requestDetails({
      id: "request-1",
      questionIds: [WEIGHT, WEIGHT, GOAL_WEIGHT],
      note: "  Please weigh yourself in the morning.  ",
      now: ASKED_AT,
    });

    // assert
    expect(outcome.status).toBe("requested");
    if (outcome.status !== "requested") return;
    expect(outcome.request.toSnapshot()).toEqual({
      id: "request-1",
      clientId: CLIENT.clientId,
      questionIds: [WEIGHT, GOAL_WEIGHT],
      note: "Please weigh yourself in the morning.",
      askedAt: ASKED_AT,
      answeredAt: null,
    });
    expect(outcome.review.stage()).toBe("needs-details");
  });

  it("an open request refuses a second request", () => {
    // arrange
    const onboardingReview = review({
      openedAt: OPENED_AT,
      requests: [request()],
    });

    // act
    const outcome = onboardingReview.requestDetails({
      id: "request-2",
      questionIds: [GOAL_WEIGHT],
      note: "And your goal weight?",
      now: NOW,
    });

    // assert
    expect(outcome).toEqual({ status: "not-in-review" });
  });

  it.each([
    ["awaiting review", {}],
    ["approved", { openedAt: OPENED_AT, approvedAt: NOW }],
  ] as const)("refuses while %s", (_label, overrides) => {
    // arrange
    const onboardingReview = review(overrides);

    // act
    const outcome = onboardingReview.requestDetails({
      id: "request-1",
      questionIds: [WEIGHT],
      note: "Please weigh yourself.",
      now: NOW,
    });

    // assert
    expect(outcome).toEqual({ status: "not-in-review" });
  });

  it.each([
    ["empty-note", [WEIGHT], "   "],
    ["no-question", [], "Please weigh yourself."],
    [
      "unknown-question",
      [{ formId: "goal-availability", fieldId: "blockersOther" }],
      "Please tell me more.",
    ],
    [
      "unknown-question",
      [{ formId: "cycle-context", fieldId: "noSuchField" }],
      "Please tell me more.",
    ],
  ] as const)("refuses as invalid with %s", (reason, questionIds, note) => {
    // arrange
    const onboardingReview = review({ openedAt: OPENED_AT });

    // act
    const outcome = onboardingReview.requestDetails({
      id: "request-1",
      questionIds,
      note,
      now: NOW,
    });

    // assert
    expect(outcome).toEqual({ status: "invalid", reason });
  });

  it("refuses a safety question she was never shown because she screens manually", () => {
    // arrange
    const onboardingReview = review({
      client: { ...CLIENT, dateOfBirth: "2015-01-01" },
      openedAt: OPENED_AT,
    });

    // act
    const outcome = onboardingReview.requestDetails({
      id: "request-1",
      questionIds: [{ formId: "safety-screening", fieldId: "heartCondition" }],
      note: "Tell me more.",
      now: NOW,
    });

    // assert
    expect(outcome).toEqual({ status: "invalid", reason: "unknown-question" });
  });
});

describe("OnboardingReview#answer", () => {
  it("merges only the asked answers, closes the request and moves her back to in-review", () => {
    // arrange
    const onboardingReview = review({
      openedAt: OPENED_AT,
      requests: [request({ questionIds: [WEIGHT, GOAL_WEIGHT] })],
    });

    // act
    const outcome = onboardingReview.answer({
      answers: { "goal-availability": { weight: 72, goalWeight: 66 } },
      units: METRIC,
      now: ANSWERED_AT,
    });

    // assert
    expect(outcome.status).toBe("answered");
    if (outcome.status !== "answered") return;
    expect(outcome.mergedAnswers).toEqual({
      ...emptyAnswers(),
      "goal-availability": { weight: 72, goalWeight: 66 },
    });
    expect(outcome.request.answeredAt).toEqual(ANSWERED_AT);
    expect(outcome.review.stage()).toBe("in-review");
    expect(outcome.review.submission?.answers["goal-availability"]).toEqual({
      weight: 72,
      height: 168,
      goalWeight: 66,
    });
    expect(outcome.submissionAnswers).toEqual(
      outcome.review.submission?.answers,
    );
  });

  it("clears an asked answer that her other asked answer made unreachable", () => {
    // arrange
    const diagnosed = {
      formId: "safety-screening",
      fieldId: "chronicConditionDiagnosed",
    } as const;
    const diagnosedList = {
      formId: "safety-screening",
      fieldId: "chronicConditionDiagnosedList",
    } as const;
    const onboardingReview = review({
      submission: {
        ...submission(),
        answers: {
          ...submittedAnswers(),
          "safety-screening": {
            chronicConditionDiagnosed: "Yes",
            chronicConditionDiagnosedList: "Asthma",
          },
        },
      },
      openedAt: OPENED_AT,
      requests: [request({ questionIds: [diagnosed, diagnosedList] })],
    });

    // act
    const outcome = onboardingReview.answer({
      answers: {
        "safety-screening": {
          chronicConditionDiagnosed: "No",
          chronicConditionDiagnosedList: 42,
        },
      },
      units: METRIC,
      now: ANSWERED_AT,
    });

    // assert
    expect(outcome.status).toBe("answered");
    if (outcome.status !== "answered") return;
    expect(outcome.mergedAnswers["safety-screening"]).toEqual({
      chronicConditionDiagnosed: "No",
      chronicConditionDiagnosedList: null,
    });
    expect(
      outcome.review.submission?.answers["safety-screening"]
        .chronicConditionDiagnosedList,
    ).toBeNull();
  });

  it("refuses an answer to a question she was not asked", () => {
    // arrange
    const onboardingReview = review({
      openedAt: OPENED_AT,
      requests: [request()],
    });

    // act
    const outcome = onboardingReview.answer({
      answers: { "goal-availability": { weight: 72, height: 150 } },
      units: METRIC,
      now: ANSWERED_AT,
    });

    // assert
    expect(outcome).toEqual({
      status: "invalid",
      problems: [
        {
          formId: "goal-availability",
          fieldId: "height",
          message: "This question was not asked.",
        },
      ],
    });
  });

  it("refuses an asked answer its own rule rejects", () => {
    // arrange
    const onboardingReview = review({
      openedAt: OPENED_AT,
      requests: [request()],
    });

    // act
    const outcome = onboardingReview.answer({
      answers: { "goal-availability": { weight: 500 } },
      units: METRIC,
      now: ANSWERED_AT,
    });

    // assert
    expect(outcome).toEqual({
      status: "invalid",
      problems: [
        {
          formId: "goal-availability",
          fieldId: "weight",
          message: "Enter a weight between 30 and 300 kg.",
        },
      ],
    });
  });

  it("refuses a required asked answer she left out", () => {
    // arrange
    const onboardingReview = review({
      openedAt: OPENED_AT,
      requests: [request()],
    });

    // act
    const outcome = onboardingReview.answer({
      answers: {},
      units: METRIC,
      now: ANSWERED_AT,
    });

    // assert
    expect(outcome).toEqual({
      status: "invalid",
      problems: [
        {
          formId: "goal-availability",
          fieldId: "weight",
          message: "Enter a weight.",
        },
      ],
    });
  });

  it("refuses when no request is open", () => {
    // arrange
    const onboardingReview = review({
      openedAt: OPENED_AT,
      requests: [request({ answeredAt: ANSWERED_AT })],
    });

    // act
    const outcome = onboardingReview.answer({
      answers: { "goal-availability": { weight: 72 } },
      units: METRIC,
      now: NOW,
    });

    // assert
    expect(outcome).toEqual({ status: "no-open-request" });
  });

  it("a second request after an answer moves her back to needs-details and its answer back to in-review", () => {
    // arrange
    const answered = review({
      openedAt: OPENED_AT,
      requests: [request({ answeredAt: ANSWERED_AT })],
    });

    // act
    const second = answered.requestDetails({
      id: "request-2",
      questionIds: [GOAL_WEIGHT],
      note: "And your goal weight?",
      now: NOW,
    });
    if (second.status !== "requested") throw new Error(second.status);
    const secondAnsweredAt = new Date("2026-10-01T10:00:00.000Z");
    const secondAnswer = second.review.answer({
      answers: { "goal-availability": { goalWeight: 64 } },
      units: METRIC,
      now: secondAnsweredAt,
    });

    // assert
    expect(answered.stage()).toBe("in-review");
    expect(second.review.stage()).toBe("needs-details");
    expect(second.review.stamps()).toEqual({
      reviewOpenedAt: OPENED_AT,
      detailsRequestedAt: NOW,
      detailsAnsweredAt: null,
      answersApprovedAt: null,
    });
    expect(secondAnswer.status).toBe("answered");
    if (secondAnswer.status !== "answered") return;
    expect(secondAnswer.review.stage()).toBe("in-review");
    expect(secondAnswer.review.stamps()).toEqual({
      reviewOpenedAt: OPENED_AT,
      detailsRequestedAt: NOW,
      detailsAnsweredAt: secondAnsweredAt,
      answersApprovedAt: null,
    });
  });
});

describe("OnboardingReview#approve", () => {
  it("approves an open review", () => {
    // arrange
    const onboardingReview = review({ openedAt: OPENED_AT });

    // act
    const outcome = onboardingReview.approve(NOW);

    // assert
    expect(outcome.status).toBe("approved");
    if (outcome.status !== "approved") return;
    expect(outcome.review.stage()).toBe("approved");
    expect(outcome.review.stamps()).toEqual({
      ...NO_STAMPS,
      reviewOpenedAt: OPENED_AT,
      answersApprovedAt: NOW,
    });
  });

  it("passes an unopened review through in-review on its way to approved", () => {
    // arrange
    const onboardingReview = review();

    // act
    const outcome = onboardingReview.approve(NOW);

    // assert
    expect(outcome.status).toBe("approved");
    if (outcome.status !== "approved") return;
    expect(outcome.review.stamps()).toEqual({
      ...NO_STAMPS,
      reviewOpenedAt: NOW,
      answersApprovedAt: NOW,
    });
  });

  it.each([
    ["before she submits", { submission: null }],
    ["while a request is open", { openedAt: OPENED_AT, requests: [request()] }],
    ["once approved", { openedAt: OPENED_AT, approvedAt: ANSWERED_AT }],
  ] as const)("refuses %s", (_label, overrides) => {
    // arrange
    const onboardingReview = review(overrides);

    // act
    const outcome = onboardingReview.approve(NOW);

    // assert
    expect(outcome).toEqual({ status: "not-reviewable" });
  });
});

describe("OnboardingReview#reviewableForms", () => {
  it("leaves out the safety form for a client who screens manually and the cycle form for a male client", () => {
    // arrange
    const onboardingReview = review({
      client: { ...CLIENT, gender: "male", dateOfBirth: "1950-01-01" },
    });

    // act
    const formIds = onboardingReview.reviewableForms().map((form) => form.id);

    // assert
    expect(formIds).toEqual([
      "goal-availability",
      "nutrition-lifestyle",
      "measurements",
    ]);
  });
});
