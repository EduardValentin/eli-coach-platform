import type { DatabaseClient } from "~/shared/database";
import { describe, expect, it, vi } from "vitest";
import type { SessionAccount } from "~/bounded-contexts/access/public/session";
import { createRequestArgs } from "~/composition-root/test-support/request-args";
import {
  composeClientProfileFeature,
  composeClientOnboardingFeature,
} from "./composition.server";
import type { AttachProgressPhotosUseCase } from "~/bounded-contexts/clients/client-profile/domain/client-profile";

const CLIENT: SessionAccount = {
  authSubjectId: "user_uninvited",
  id: "acct_uninvited",
  role: "CLIENT",
};

const COACH: SessionAccount = {
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
    const response = await feature.clientSettingsController.saveUnits(
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
    expect(handles.clientReachPort.findByAuthSubjectId).toHaveBeenCalledWith(
      "user_uninvited",
    );
  });

  it("names no due line for an account with no client record through the client reach it is handed", async () => {
    // arrange
    const handles = createHandles();
    const { feature } = composeClientProfileFeature(handles);

    // act
    const nudge = await feature.clientMeasurementsController.loadNudge(
      accountArgs({ account: CLIENT }),
    );

    // assert
    expect(nudge).toEqual({ dueLine: null });
    expect(handles.clientReachPort.findByAuthSubjectId).toHaveBeenCalledWith(
      "user_uninvited",
    );
  });

  it("answers not found to the coach's profile read of a client no one knows", async () => {
    // arrange
    const handles = createHandles();
    const { feature } = composeClientProfileFeature(handles);

    // act
    const loading = feature.clientProfileController.load(
      accountArgs({ account: COACH }),
      UNKNOWN_CLIENT_ID,
    );

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
    expect(handles.clientIdentitiesPort.findByClientId).toHaveBeenCalledWith(
      UNKNOWN_CLIENT_ID,
    );
  });

  it("refuses photos whose consent it cannot read through the profiles it composes, reporting through the logger it is handed", async () => {
    // arrange
    const handles = createHandles();
    const { handles: published } = composeClientProfileFeature(handles);

    // act
    const outcomes = await published.attachProgressPhotosUseCase.execute({
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
    expect(handles.loggerPort.warn).toHaveBeenCalledWith(
      "Progress photo refused.",
      {
        clientId: UNKNOWN_CLIENT_ID,
        entryId: UNKNOWN_ENTRY_ID,
        eventCategory: "progress_photo_refused",
        reason: "storage-failed",
        receivedBytes: 3,
        view: "front",
      },
    );
    expect(handles.progressPhotoRenditionsPort.render).not.toHaveBeenCalled();
  });
});

function createHandles() {
  return {
    clientAvatarRenditionsPort: { render: vi.fn() },
    clientAvatarStorePort: { store: vi.fn(), open: vi.fn(), delete: vi.fn() },
    clientIdentitiesPort: {
      findByClientId: vi.fn().mockResolvedValue(null),
      findByClientIds: vi.fn().mockResolvedValue([]),
    },
    clientReachPort: {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
    },
    clockPort: { now: () => new Date("2026-09-28T10:00:00.000Z") },
    database: createUnreachableDatabase(),
    loggerPort: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
    progressPhotoRenditionsPort: { render: vi.fn() },
    progressPhotoStorePort: { store: vi.fn(), open: vi.fn(), delete: vi.fn() },
  };
}

type RequestShape = { method?: "GET" | "PUT"; body?: unknown };

function accountArgs({
  account,
  request = {},
}: {
  account: SessionAccount;
  request?: RequestShape;
}) {
  const portal = {
    appBasePath: "/",
    publicAppUrl: "https://evoa.fit",
    signInUrl: "https://accounts.evoa.fit/sign-in",
  };

  return createRequestArgs({
    portal,
    session: { account, kind: "authenticated" },
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
    const { clientOnboardingController } =
      composeClientOnboardingFeature(handles);

    // act
    const loading = clientOnboardingController.loadOnboarding(clientArgs());

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
    expect(
      handles.onboardingStandingsPort.findByAuthSubjectId,
    ).toHaveBeenCalledWith("user_uninvited");
  });

  it("refuses a draft from an account with no client record without writing anything", async () => {
    // arrange
    const handles = createOnboardingHandles();
    const { clientOnboardingController } =
      composeClientOnboardingFeature(handles);

    // act
    const response = await clientOnboardingController.saveDraft(
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
    expect(handles.loggerPort.info).not.toHaveBeenCalledWith(
      "Client onboarding draft saved.",
      expect.anything(),
    );
  });

  it("refuses a submission from an account with no client record without stamping anything or attaching its photos", async () => {
    // arrange
    const handles = createOnboardingHandles();
    const { clientOnboardingController } =
      composeClientOnboardingFeature(handles);
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
    const response = await clientOnboardingController.submit(
      createRequestArgs({
        ...clientAccess(),
        request: new Request(
          "https://evoa.fit/api/client-onboarding/submission",
          { body: form, method: "POST" },
        ),
      }),
    );

    // assert
    expect(response.status).toBe(404);
    expect(
      handles.onboardingSubmissionRecorderPort.recordOnboardingSubmitted,
    ).not.toHaveBeenCalled();
    expect(handles.attachProgressPhotosUseCase.execute).not.toHaveBeenCalled();
  });

  it("refuses answers to a request from an account with no client record without stamping anything", async () => {
    // arrange
    const handles = createOnboardingHandles();
    const { clientOnboardingController } =
      composeClientOnboardingFeature(handles);

    // act
    const response = await clientOnboardingController.answerDetails(
      clientArgs({
        method: "POST",
        body: { answers: { "goal-availability": { weight: 64 } } },
      }),
    );

    // assert
    expect(response.status).toBe(404);
    expect(
      handles.reviewStampRecorderPort.recordReviewStamp,
    ).not.toHaveBeenCalled();
  });

  it("answers not found to the coach's review of a client no one knows", async () => {
    // arrange
    const handles = createOnboardingHandles();
    const { onboardingReviewController } =
      composeClientOnboardingFeature(handles);

    // act
    const loading = onboardingReviewController.loadReview(
      onboardingAccountArgs({ account: COACH }),
      UNKNOWN_CLIENT_ID,
    );

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
    expect(handles.onboardingStandingsPort.findByClientId).toHaveBeenCalledWith(
      UNKNOWN_CLIENT_ID,
    );
  });

  it("refuses a detail request for a client no one knows without sending an email", async () => {
    // arrange
    const handles = createOnboardingHandles();
    const { onboardingReviewController } =
      composeClientOnboardingFeature(handles);

    // act
    const response = await onboardingReviewController.requestDetails(
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
    expect(handles.productEmailPort.send).not.toHaveBeenCalled();
  });
});

function createOnboardingHandles() {
  return {
    appBasePath: "/",
    attachProgressPhotosUseCase: {
      execute: vi.fn().mockResolvedValue({}),
    } as unknown as AttachProgressPhotosUseCase & {
      execute: ReturnType<typeof vi.fn>;
    },
    clientIdentitiesPort: {
      findByClientId: vi.fn().mockResolvedValue(null),
      findByClientIds: vi.fn().mockResolvedValue([]),
    },
    clockPort: { now: () => new Date("2026-09-28T10:00:00.000Z") },
    contactEmail: "contact@evoa.fit",
    clientSettingsSourcePort: {
      findByClientId: vi.fn().mockResolvedValue(null),
    },
    database: createUnreachableDatabase(),
    loggerPort: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
    measurementIdsPort: { generate: () => "entry-1" },
    clientMeasurementsSourcePort: {
      listByClientId: vi.fn().mockResolvedValue([]),
    },
    onboardingStandingsPort: {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
      findByClientId: vi.fn().mockResolvedValue(null),
    },
    onboardingSubmissionRecorderPort: {
      recordOnboardingSubmitted: vi.fn().mockResolvedValue(undefined),
    },
    productEmailPort: { provider: "memory", send: vi.fn() },
    publicAppUrl: "https://evoa.fit",
    recordMeasurementEntry: vi.fn().mockResolvedValue(undefined),
    recordPhotoConsent: vi.fn().mockResolvedValue(undefined),
    reviewStampRecorderPort: {
      recordReviewStamp: vi.fn().mockResolvedValue(undefined),
    },
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
  account: SessionAccount;
  request?: OnboardingRequestShape;
}) {
  return createRequestArgs({
    ...accountAccess(account),
    request: new Request("https://evoa.fit/client/onboarding", {
      body:
        request.body === undefined ? undefined : JSON.stringify(request.body),
      headers: { "Content-Type": "application/json" },
      method: request.method ?? "GET",
    }),
  });
}

function clientAccess() {
  return accountAccess(CLIENT);
}

function accountAccess(account: SessionAccount) {
  return {
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
    session: { account, kind: "authenticated" } as const,
  };
}
