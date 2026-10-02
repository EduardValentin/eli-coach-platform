import type { DatabaseClient } from "@eli-coach-platform/db";
import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import type { AttachProgressPhotosUseCase } from "@eli-coach-platform/domain/client-profile";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/features/accounts/server/accounts-composition.server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { composeClientOnboardingFeature } from "./client-onboarding-composition.server";

const CLIENT: AccountSnapshot = {
  authSubjectId: "user_uninvited",
  id: "acct_uninvited",
  role: "CLIENT",
};

const COACH: AccountSnapshot = {
  authSubjectId: "user_coach",
  id: "acct_coach",
  role: "COACH",
};

const UNKNOWN_CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";

describe("composeClientOnboardingFeature", () => {
  it("answers not found to an account with no client record without reading any onboarding", async () => {
    // arrange
    const handles = createHandles();
    const { controller } = composeClientOnboardingFeature(handles);

    // act
    const loading = controller.loadOnboarding(clientArgs());

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
    expect(handles.onboardingClients.findByAuthSubjectId).toHaveBeenCalledWith(
      "user_uninvited",
    );
  });

  it("refuses a draft from an account with no client record without writing anything", async () => {
    // arrange
    const handles = createHandles();
    const { controller } = composeClientOnboardingFeature(handles);

    // act
    const response = await controller.saveDraft(
      clientArgs({
        method: "PUT",
        body: {
          formId: "goal-availability",
          answers: emptyAnswers(),
          currentFormIndex: 0,
          consents: noConsents(),
        },
      }),
    );

    // assert
    expect(response.status).toBe(404);
    expect(handles.incidents.onboardingDraftSaved).not.toHaveBeenCalled();
  });

  it("refuses a submission from an account with no client record without stamping anything or attaching its photos", async () => {
    // arrange
    const handles = createHandles();
    const { controller } = composeClientOnboardingFeature(handles);
    const form = new FormData();
    form.set(
      "submission",
      JSON.stringify({ answers: emptyAnswers(), consents: noConsents() }),
    );
    form.set(
      "front",
      new File([new Uint8Array([255, 216, 255])], "front.jpg", {
        type: "image/jpeg",
      }),
    );

    // act
    const response = await controller.submit(
      createRequestArgs({
        contexts: clientContexts(),
        request: new Request(
          "https://evoa.fit/api/client-onboarding/submission",
          { body: form, method: "POST" },
        ),
      }),
    );

    // assert
    expect(response.status).toBe(404);
    expect(
      handles.onboardingSubmissionStamps.recordOnboardingSubmitted,
    ).not.toHaveBeenCalled();
    expect(handles.attachProgressPhotos.execute).not.toHaveBeenCalled();
  });

  it("refuses answers to a request from an account with no client record without stamping anything", async () => {
    // arrange
    const handles = createHandles();
    const { controller } = composeClientOnboardingFeature(handles);

    // act
    const response = await controller.answerDetails(
      clientArgs({
        method: "POST",
        body: { answers: { "goal-availability": { weight: 64 } } },
      }),
    );

    // assert
    expect(response.status).toBe(404);
    expect(handles.reviewStampWriter).not.toHaveBeenCalled();
  });

  it("answers not found to the coach's review of a client no one knows", async () => {
    // arrange
    const handles = createHandles();
    const { coachReview } = composeClientOnboardingFeature(handles);

    // act
    const loading = coachReview.loadReview(
      accountArgs({ account: COACH }),
      UNKNOWN_CLIENT_ID,
    );

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
    expect(handles.onboardingClients.findByClientId).toHaveBeenCalledWith(
      UNKNOWN_CLIENT_ID,
    );
  });

  it("refuses a detail request for a client no one knows without sending an email", async () => {
    // arrange
    const handles = createHandles();
    const { coachReview } = composeClientOnboardingFeature(handles);

    // act
    const response = await coachReview.requestDetails(
      accountArgs({
        account: COACH,
        request: {
          method: "POST",
          body: {
            clientId: UNKNOWN_CLIENT_ID,
            questions: [{ formId: "goal-availability", fieldId: "weight" }],
            note: "Your weight looks off.",
          },
        },
      }),
    );

    // assert
    expect(response.status).toBe(404);
    expect(handles.productEmail.send).not.toHaveBeenCalled();
  });
});

function createHandles() {
  return {
    appBasePath: "/",
    attachProgressPhotos: {
      execute: vi.fn().mockResolvedValue({}),
    } as unknown as AttachProgressPhotosUseCase & {
      execute: ReturnType<typeof vi.fn>;
    },
    clock: { now: () => new Date("2026-09-28T10:00:00.000Z") },
    contactEmail: "contact@evoa.fit",
    database: createUnreachableDatabase(),
    incidents: {
      onboardingAnswersApproved: vi.fn(),
      onboardingDetailsAnswered: vi.fn(),
      onboardingDetailsRefused: vi.fn(),
      onboardingDetailsRequestEmailFailed: vi.fn(),
      onboardingDetailsRequested: vi.fn(),
      onboardingDraftSaveFailed: vi.fn(),
      onboardingDraftSaved: vi.fn(),
      onboardingReviewOpened: vi.fn(),
      onboardingReviewStampsRepaired: vi.fn(),
      onboardingSubmissionAccepted: vi.fn(),
      onboardingSubmissionRefused: vi.fn(),
    },
    measurements: { listByClientId: vi.fn().mockResolvedValue([]) },
    onboardingClients: {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      findByClientId: vi.fn().mockResolvedValue(null),
    },
    onboardingReviewStamps: { record: vi.fn().mockResolvedValue(undefined) },
    onboardingSubmissionStamps: {
      recordOnboardingSubmitted: vi.fn().mockResolvedValue(undefined),
    },
    productEmail: { provider: "memory", send: vi.fn() },
    publicAppUrl: "https://evoa.fit",
    recordMeasurementEntry: vi.fn().mockResolvedValue(UNKNOWN_CLIENT_ID),
    reviewStampWriter: vi.fn().mockResolvedValue(undefined),
    saveClientProfile: vi.fn().mockResolvedValue(undefined),
    unitPreferences: { findByClientId: vi.fn().mockResolvedValue(null) },
  };
}

function emptyAnswers() {
  return {
    "goal-availability": {},
    "safety-screening": {},
    "cycle-context": {},
    "nutrition-lifestyle": {},
    measurements: {},
  };
}

function noConsents() {
  return {
    specialCategoryAt: null,
    disclaimerAt: null,
    progressPhotosAt: null,
  };
}

type RequestShape = { method?: "GET" | "POST" | "PUT"; body?: unknown };

function clientArgs(request: RequestShape = {}) {
  return accountArgs({ account: CLIENT, request });
}

function accountArgs({
  account,
  request = {},
}: {
  account: AccountSnapshot;
  request?: RequestShape;
}) {
  return createRequestArgs({
    contexts: accountContexts(account),
    request: new Request("https://evoa.fit/client/onboarding", {
      body:
        request.body === undefined ? undefined : JSON.stringify(request.body),
      headers: { "Content-Type": "application/json" },
      method: request.method ?? "GET",
    }),
  });
}

function clientContexts() {
  return accountContexts(CLIENT);
}

function accountContexts(account: AccountSnapshot) {
  const accounts = {
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
  } as unknown as AccountsFeature;

  return [
    contextEntry(accountsContext, accounts),
    contextEntry(sessionContext, { account, kind: "authenticated" }),
  ];
}

function createUnreachableDatabase(): DatabaseClient {
  const unreachable = () => {
    throw new Error("database down");
  };

  return {
    delete: unreachable,
    insert: unreachable,
    select: unreachable,
    transaction: unreachable,
    update: unreachable,
  } as unknown as DatabaseClient;
}
