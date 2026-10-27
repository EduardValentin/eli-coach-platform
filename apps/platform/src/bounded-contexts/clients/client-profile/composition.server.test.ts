import type { DatabaseClient } from "~/shared/database";
import type { AccountSnapshot } from "~/bounded-contexts/access/accounts/domain/account";
import { describe, expect, it, vi } from "vitest";
import {
  type AccountsFeature,
  accountsContext,
} from "~/bounded-contexts/access/accounts/adapters/inbound/http/context.server";
import { sessionContext } from "~/bounded-contexts/access/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";
import {
  composeClientProfileFeature,
  composeClientOnboardingFeature,
} from "./composition.server";
import type { AttachProgressPhotosUseCase } from "~/bounded-contexts/clients/client-profile/domain/client-profile";

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
const UNKNOWN_ENTRY_ID = "3f2b8f61-0c4e-4f7a-9d2b-6a1e5c7d8e90";

describe("composeClientProfileFeature", () => {
  it("refuses units from an account with no client record through the client reader it is handed", async () => {
    // arrange
    const handles = createHandles();
    const { feature } = composeClientProfileFeature(handles);

    // act
    const response = await feature.clientSettings.saveUnits(
      accountArgs({
        account: CLIENT,
        request: {
          method: "PUT",
          body: { weightUnit: "lb", heightUnit: "ft-in" },
        },
      }),
    );

    // assert
    expect(response.status).toBe(404);
    expect(handles.clientReach.findByAuthSubjectId).toHaveBeenCalledWith(
      "user_uninvited",
    );
  });

  it("names no due line for an account with no client record through the client reach it is handed", async () => {
    // arrange
    const handles = createHandles();
    const { feature } = composeClientProfileFeature(handles);

    // act
    const nudge = await feature.clientMeasurements.loadNudge(
      accountArgs({ account: CLIENT }),
    );

    // assert
    expect(nudge).toEqual({ dueLine: null });
    expect(handles.clientReach.findByAuthSubjectId).toHaveBeenCalledWith(
      "user_uninvited",
    );
  });

  it("answers not found to the coach's profile read of a client no one knows", async () => {
    // arrange
    const handles = createHandles();
    const { feature } = composeClientProfileFeature(handles);

    // act
    const loading = feature.coachProfile.load(
      accountArgs({ account: COACH }),
      UNKNOWN_CLIENT_ID,
    );

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
    expect(handles.clientIdentities.findByClientId).toHaveBeenCalledWith(
      UNKNOWN_CLIENT_ID,
    );
  });

  it("refuses photos whose consent it cannot read through the profiles it composes, reporting through the incidents it is handed", async () => {
    // arrange
    const handles = createHandles();
    const { handles: published } = composeClientProfileFeature(handles);

    // act
    const outcomes = await published.attachProgressPhotos.execute({
      clientId: UNKNOWN_CLIENT_ID,
      entryId: UNKNOWN_ENTRY_ID,
      photos: [
        {
          view: "front",
          mimeType: "image/jpeg",
          sizeBytes: 3,
          bytes: new Uint8Array([255, 216, 255]),
        },
      ],
    });

    // assert
    expect(outcomes).toEqual({ front: "refused" });
    expect(handles.incidents.progressPhotoRefused).toHaveBeenCalledWith({
      clientId: UNKNOWN_CLIENT_ID,
      entryId: UNKNOWN_ENTRY_ID,
      view: "front",
      receivedBytes: 3,
      reason: "storage-failed",
    });
    expect(handles.progressPhotoRenditions.render).not.toHaveBeenCalled();
  });
});

function createHandles() {
  return {
    clientAvatarRenditions: { render: vi.fn() },
    clientAvatarStore: { store: vi.fn(), open: vi.fn(), delete: vi.fn() },
    clientIdentities: {
      findByClientId: vi.fn().mockResolvedValue(null),
      findByClientIds: vi.fn().mockResolvedValue([]),
    },
    clientReach: {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
    },
    clock: { now: () => new Date("2026-09-28T10:00:00.000Z") },
    database: createUnreachableDatabase(),
    incidents: {
      measurementEntrySaved: vi.fn(),
      progressPhotoStored: vi.fn(),
      progressPhotoRefused: vi.fn(),
      progressPhotoDeleted: vi.fn(),
      progressPhotoAccessRefused: vi.fn(),
      clientAvatarFileOrphaned: vi.fn(),
    },
    progressPhotoRenditions: { render: vi.fn() },
    progressPhotoStore: { store: vi.fn(), open: vi.fn(), delete: vi.fn() },
  };
}

type RequestShape = { method?: "GET" | "PUT"; body?: unknown };

function accountArgs({
  account,
  request = {},
}: {
  account: AccountSnapshot;
  request?: RequestShape;
}) {
  const accounts = {
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
  } as unknown as AccountsFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(accountsContext, accounts),
      contextEntry(sessionContext, { account, kind: "authenticated" }),
    ],
    request: new Request(
      "https://evoa.fit/api/client-profile/unit-preference",
      {
        body:
          request.body === undefined ? undefined : JSON.stringify(request.body),
        headers: { "Content-Type": "application/json" },
        method: request.method ?? "GET",
      },
    ),
  });
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

describe("composeClientOnboardingFeature", () => {
  it("answers not found to an account with no client record without reading any onboarding", async () => {
    // arrange
    const handles = createOnboardingHandles();
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
    const handles = createOnboardingHandles();
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
    const handles = createOnboardingHandles();
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
    const handles = createOnboardingHandles();
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
    const handles = createOnboardingHandles();
    const { coachReview } = composeClientOnboardingFeature(handles);

    // act
    const loading = coachReview.loadReview(
      onboardingAccountArgs({ account: COACH }),
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
    const handles = createOnboardingHandles();
    const { coachReview } = composeClientOnboardingFeature(handles);

    // act
    const response = await coachReview.requestDetails(
      onboardingAccountArgs({
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

function createOnboardingHandles() {
  return {
    appBasePath: "/",
    attachProgressPhotos: {
      execute: vi.fn().mockResolvedValue({}),
    } as unknown as AttachProgressPhotosUseCase & {
      execute: ReturnType<typeof vi.fn>;
    },
    clientIdentities: {
      findByClientId: vi.fn().mockResolvedValue(null),
      findByClientIds: vi.fn().mockResolvedValue([]),
    },
    clock: { now: () => new Date("2026-09-28T10:00:00.000Z") },
    contactEmail: "contact@evoa.fit",
    clientSettings: { findByClientId: vi.fn().mockResolvedValue(null) },
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
    measurementIds: { generate: () => "entry-1" },
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
    recordMeasurementEntry: vi.fn().mockResolvedValue(undefined),
    recordPhotoConsent: vi.fn().mockResolvedValue(undefined),
    reviewStampWriter: vi.fn().mockResolvedValue(undefined),
    seedCoaching: vi.fn().mockResolvedValue(undefined),
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

type OnboardingRequestShape = {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
};

function clientArgs(request: OnboardingRequestShape = {}) {
  return onboardingAccountArgs({ account: CLIENT, request });
}

function onboardingAccountArgs({
  account,
  request = {},
}: {
  account: AccountSnapshot;
  request?: OnboardingRequestShape;
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
