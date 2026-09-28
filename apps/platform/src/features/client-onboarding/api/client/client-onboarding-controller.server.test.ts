import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import {
  ClientOnboarding,
  emptyDraft,
  type OnboardingDraft,
  type ReadClientOnboardingUseCase,
  type SaveOnboardingDraftUseCase,
  type SubmitOnboardingUseCase,
} from "@eli-coach-platform/domain/client-onboarding";
import type { SaveUnitPreferenceUseCase } from "@eli-coach-platform/domain/unit-preference";
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

import { ClientOnboardingController } from "./client-onboarding-controller.server";

const NOW = new Date("2026-09-28T10:00:00.000Z");
const CONSENTED_AT = "2026-09-28T09:55:00.000Z";
const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";

const CLIENT: AccountSnapshot = {
  authSubjectId: "user_ana",
  id: "acct_ana",
  role: "CLIENT",
};

const COACH_SESSION: ResolvedSession = {
  account: { ...CLIENT, role: "COACH" },
  kind: "authenticated",
};

type ReadResult = Awaited<ReturnType<ReadClientOnboardingUseCase["execute"]>>;
type SaveDraftResult = Awaited<
  ReturnType<SaveOnboardingDraftUseCase["execute"]>
>;
type SubmitResult = Awaited<ReturnType<SubmitOnboardingUseCase["execute"]>>;
type SaveUnitPreferenceResult = Awaited<
  ReturnType<SaveUnitPreferenceUseCase["execute"]>
>;

describe("ClientOnboardingController load", () => {
  it.each<[VisitorGender, string[]]>([
    [
      "female",
      [
        "goal-availability",
        "safety-screening",
        "cycle-context",
        "nutrition-lifestyle",
        "measurements",
      ],
    ],
    [
      "prefer_not_to_say",
      [
        "goal-availability",
        "safety-screening",
        "nutrition-lifestyle",
        "measurements",
      ],
    ],
  ])(
    "hands a %s client her forms, an empty draft and her units on her first visit",
    async (gender, formIds) => {
      // arrange
      const { controller, readClientOnboarding } = createController({
        reading: readingOf({ gender }),
      });

      // act
      const page = await controller.loadOnboarding(clientArgs());

      // assert
      expect(page).toEqual({
        clientId: CLIENT_ID,
        formIds,
        gender,
        manualScreening: false,
        draft: {
          answers: emptyDraft(NOW).answers,
          currentFormIndex: 0,
          consents: {
            specialCategoryAt: null,
            disclaimerAt: null,
            progressPhotosAt: null,
          },
          updatedAt: null,
        },
        unitPreference: { weightUnit: "kg", heightUnit: "cm" },
        resumed: false,
      });
      expect(readClientOnboarding).toHaveBeenCalledWith("user_ana");
    },
  );

  it("resumes her saved draft where she left it", async () => {
    // arrange
    const draft: OnboardingDraft = {
      ...emptyDraft(new Date("2026-09-27T18:00:00.000Z")),
      answers: {
        ...emptyDraft(NOW).answers,
        "goal-availability": { primaryGoal: "build_strength" },
      },
      currentFormIndex: 2,
      consents: {
        specialCategoryAt: new Date(CONSENTED_AT),
        disclaimerAt: null,
        progressPhotosAt: null,
      },
    };
    const { controller } = createController({
      reading: readingOf({
        gender: "female",
        draft,
        unitPreference: { weightUnit: "lb", heightUnit: "ft-in" },
      }),
    });

    // act
    const page = await controller.loadOnboarding(clientArgs());

    // assert
    expect(page).toMatchObject({
      draft: {
        answers: draft.answers,
        currentFormIndex: 2,
        consents: { specialCategoryAt: CONSENTED_AT },
        updatedAt: "2026-09-27T18:00:00.000Z",
      },
      unitPreference: { weightUnit: "lb", heightUnit: "ft-in" },
      resumed: true,
    });
  });

  it("does not call a draft with only cleared answers a resumed one", async () => {
    // arrange
    const { controller } = createController({
      reading: readingOf({
        gender: "female",
        draft: {
          ...emptyDraft(NOW),
          answers: {
            ...emptyDraft(NOW).answers,
            "goal-availability": { primaryGoal: null, notes: "", days: [] },
          },
        },
      }),
    });

    // act
    const page = await controller.loadOnboarding(clientArgs());

    // assert
    expect(page.resumed).toBe(false);
  });

  it("asks for manual screening when her age falls outside the screening range", async () => {
    // arrange
    const { controller } = createController({
      reading: readingOf({ gender: "female", dateOfBirth: "1950-01-01" }),
    });

    // act
    const page = await controller.loadOnboarding(clientArgs());

    // assert
    expect(page.manualScreening).toBe(true);
  });

  it("answers not found to a client account with no client record", async () => {
    // arrange
    const { controller } = createController({ reading: null });

    // act
    const thrown = await captureThrown(() =>
      controller.loadOnboarding(clientArgs()),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("refuses the coach without reading any onboarding", async () => {
    // arrange
    const { controller, readClientOnboarding } = createController({
      reading: readingOf({ gender: "female" }),
    });

    // act
    const thrown = await captureThrown(() =>
      controller.loadOnboarding(clientArgs({ session: COACH_SESSION })),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(readClientOnboarding).not.toHaveBeenCalled();
  });

  it("sends an anonymous visitor to sign in without reading any onboarding", async () => {
    // arrange
    const { controller, readClientOnboarding } = createController({
      reading: readingOf({ gender: "female" }),
    });

    // act
    const thrown = await captureThrown(() =>
      controller.loadOnboarding(clientArgs({ session: { kind: "anonymous" } })),
    );

    // assert
    expect((thrown as Response).status).toBe(302);
    expect(readClientOnboarding).not.toHaveBeenCalled();
  });
});

describe("ClientOnboardingController save draft", () => {
  it("saves her draft with her consents as instants and answers no content", async () => {
    // arrange
    const { controller, saveOnboardingDraft } = createController({
      saveDraftResult: { status: "saved" },
    });

    // act
    const response = await controller.saveDraft(
      clientArgs({ method: "PUT", body: JSON.stringify(draftRequest()) }),
    );

    // assert
    expect(response.status).toBe(204);
    expect(saveOnboardingDraft).toHaveBeenCalledWith({
      authSubjectId: "user_ana",
      formId: "safety-screening",
      answers: draftRequest().answers,
      currentFormIndex: 1,
      consents: {
        specialCategoryAt: new Date(CONSENTED_AT),
        disclaimerAt: null,
        progressPhotosAt: null,
      },
    });
  });

  it.each<[SaveDraftResult["status"], number, string]>([
    ["not-on-journey", 404, "not-on-journey"],
    ["already-submitted", 409, "already-submitted"],
  ])("answers %s with %i", async (status, expectedStatus, expectedError) => {
    // arrange
    const { controller } = createController({
      saveDraftResult: { status } as SaveDraftResult,
    });

    // act
    const response = await controller.saveDraft(
      clientArgs({ method: "PUT", body: JSON.stringify(draftRequest()) }),
    );

    // assert
    expect(response.status).toBe(expectedStatus);
    expect(await response.json()).toEqual({ error: expectedError });
  });

  it.each([
    ["a body that is not JSON", "formId=safety-screening"],
    [
      "a draft without its step",
      JSON.stringify({ ...draftRequest(), currentFormIndex: undefined }),
    ],
    [
      "a body larger than five forms of answers",
      JSON.stringify({
        ...draftRequest(),
        answers: {
          ...draftRequest().answers,
          measurements: Object.fromEntries(
            Array.from({ length: 40 }, (_, index) => [
              `note${index}`,
              "a".repeat(2000),
            ]),
          ),
        },
      }),
    ],
  ])("refuses %s without saving anything", async (_label, body) => {
    // arrange
    const { controller, saveOnboardingDraft } = createController({
      saveDraftResult: { status: "saved" },
    });

    // act
    const response = await controller.saveDraft(
      clientArgs({ method: "PUT", body }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(saveOnboardingDraft).not.toHaveBeenCalled();
  });

  it("refuses the coach without saving anything", async () => {
    // arrange
    const { controller, saveOnboardingDraft } = createController({
      saveDraftResult: { status: "saved" },
    });

    // act
    const thrown = await captureThrown(() =>
      controller.saveDraft(
        clientArgs({
          method: "PUT",
          body: JSON.stringify(draftRequest()),
          session: COACH_SESSION,
        }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(saveOnboardingDraft).not.toHaveBeenCalled();
  });

  it("refuses an anonymous visitor without saving anything", async () => {
    // arrange
    const { controller, saveOnboardingDraft } = createController({
      saveDraftResult: { status: "saved" },
    });

    // act
    const thrown = await captureThrown(() =>
      controller.saveDraft(
        clientArgs({
          method: "PUT",
          body: JSON.stringify(draftRequest()),
          session: { kind: "anonymous" },
        }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(401);
    expect(saveOnboardingDraft).not.toHaveBeenCalled();
  });
});

describe("ClientOnboardingController submit", () => {
  it("sends her on to her portal once her onboarding is submitted", async () => {
    // arrange
    const { controller, submitOnboarding } = createController({
      submitResult: { status: "submitted", submittedAt: NOW },
    });

    // act
    const response = await controller.submit(
      clientArgs({ method: "POST", body: JSON.stringify(submitRequest()) }),
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ redirectTo: "/client" });
    expect(submitOnboarding).toHaveBeenCalledWith({
      authSubjectId: "user_ana",
      answers: submitRequest().answers,
      consents: {
        specialCategoryAt: new Date(CONSENTED_AT),
        disclaimerAt: new Date(CONSENTED_AT),
        progressPhotosAt: null,
      },
    });
  });

  it("names every problem by its form and field", async () => {
    // arrange
    const problems = [
      {
        formId: "measurements" as const,
        fieldId: "waist",
        message: "Add your waist measurement.",
      },
    ];
    const { controller } = createController({
      submitResult: { status: "invalid", problems },
    });

    // act
    const response = await controller.submit(
      clientArgs({ method: "POST", body: JSON.stringify(submitRequest()) }),
    );

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ problems });
  });

  it("names the consent she has not given", async () => {
    // arrange
    const { controller } = createController({
      submitResult: { status: "consent-missing", consent: "disclaimer" },
    });

    // act
    const response = await controller.submit(
      clientArgs({ method: "POST", body: JSON.stringify(submitRequest()) }),
    );

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ consent: "disclaimer" });
  });

  it.each<[SubmitResult["status"], number, string]>([
    ["not-on-journey", 404, "not-on-journey"],
    ["already-submitted", 409, "already-submitted"],
  ])("answers %s with %i", async (status, expectedStatus, expectedError) => {
    // arrange
    const { controller } = createController({
      submitResult: { status } as SubmitResult,
    });

    // act
    const response = await controller.submit(
      clientArgs({ method: "POST", body: JSON.stringify(submitRequest()) }),
    );

    // assert
    expect(response.status).toBe(expectedStatus);
    expect(await response.json()).toEqual({ error: expectedError });
  });

  it("refuses answers it cannot read without submitting anything", async () => {
    // arrange
    const { controller, submitOnboarding } = createController({
      submitResult: { status: "submitted", submittedAt: NOW },
    });

    // act
    const response = await controller.submit(
      clientArgs({
        method: "POST",
        body: JSON.stringify({ answers: submitRequest().answers }),
      }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(submitOnboarding).not.toHaveBeenCalled();
  });

  it("refuses the coach without submitting anything", async () => {
    // arrange
    const { controller, submitOnboarding } = createController({
      submitResult: { status: "submitted", submittedAt: NOW },
    });

    // act
    const thrown = await captureThrown(() =>
      controller.submit(
        clientArgs({
          method: "POST",
          body: JSON.stringify(submitRequest()),
          session: COACH_SESSION,
        }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(submitOnboarding).not.toHaveBeenCalled();
  });
});

describe("ClientOnboardingController save unit preference", () => {
  it("saves the units she chose and answers no content", async () => {
    // arrange
    const { controller, saveUnitPreference } = createController({
      unitPreferenceResult: { status: "saved" },
    });

    // act
    const response = await controller.saveUnitPreference(
      clientArgs({
        method: "PUT",
        body: JSON.stringify({ weightUnit: "lb", heightUnit: "ft-in" }),
      }),
    );

    // assert
    expect(response.status).toBe(204);
    expect(saveUnitPreference).toHaveBeenCalledWith({
      authSubjectId: "user_ana",
      preference: { weightUnit: "lb", heightUnit: "ft-in" },
    });
  });

  it("answers not found to a client account with no client record", async () => {
    // arrange
    const { controller } = createController({
      unitPreferenceResult: { status: "not-on-journey" },
    });

    // act
    const response = await controller.saveUnitPreference(
      clientArgs({
        method: "PUT",
        body: JSON.stringify({ weightUnit: "kg", heightUnit: "cm" }),
      }),
    );

    // assert
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not-on-journey" });
  });

  it("refuses a unit the platform does not offer without saving anything", async () => {
    // arrange
    const { controller, saveUnitPreference } = createController({
      unitPreferenceResult: { status: "saved" },
    });

    // act
    const response = await controller.saveUnitPreference(
      clientArgs({
        method: "PUT",
        body: JSON.stringify({ weightUnit: "stone", heightUnit: "cm" }),
      }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(saveUnitPreference).not.toHaveBeenCalled();
  });

  it("refuses the coach without saving anything", async () => {
    // arrange
    const { controller, saveUnitPreference } = createController({
      unitPreferenceResult: { status: "saved" },
    });

    // act
    const thrown = await captureThrown(() =>
      controller.saveUnitPreference(
        clientArgs({
          method: "PUT",
          body: JSON.stringify({ weightUnit: "kg", heightUnit: "cm" }),
          session: COACH_SESSION,
        }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(saveUnitPreference).not.toHaveBeenCalled();
  });
});

function readingOf(options: {
  gender: VisitorGender;
  dateOfBirth?: string;
  draft?: OnboardingDraft;
  unitPreference?: NonNullable<ReadResult>["unitPreference"];
}): NonNullable<ReadResult> {
  return {
    onboarding: ClientOnboarding.reconstitute({
      client: {
        clientId: CLIENT_ID,
        gender: options.gender,
        dateOfBirth: options.dateOfBirth ?? "1994-03-14",
      },
      draft: options.draft ?? null,
      submission: null,
    }),
    unitPreference: options.unitPreference ?? {
      weightUnit: "kg",
      heightUnit: "cm",
    },
  };
}

function draftRequest() {
  return {
    formId: "safety-screening",
    answers: {
      ...emptyDraft(NOW).answers,
      "goal-availability": { primaryGoal: "build_strength" },
    },
    currentFormIndex: 1,
    consents: {
      specialCategoryAt: CONSENTED_AT,
      disclaimerAt: null,
      progressPhotosAt: null,
    },
  };
}

function submitRequest() {
  return {
    answers: {
      ...emptyDraft(NOW).answers,
      "goal-availability": { primaryGoal: "build_strength" },
    },
    consents: {
      specialCategoryAt: CONSENTED_AT,
      disclaimerAt: CONSENTED_AT,
      progressPhotosAt: null,
    },
  };
}

function createController(options: {
  reading?: ReadResult;
  saveDraftResult?: SaveDraftResult;
  submitResult?: SubmitResult;
  unitPreferenceResult?: SaveUnitPreferenceResult;
}) {
  const readClientOnboarding = vi
    .fn()
    .mockResolvedValue(options.reading ?? null);
  const saveOnboardingDraft = vi
    .fn()
    .mockResolvedValue(options.saveDraftResult);
  const submitOnboarding = vi.fn().mockResolvedValue(options.submitResult);
  const saveUnitPreference = vi
    .fn()
    .mockResolvedValue(options.unitPreferenceResult);
  const controller = new ClientOnboardingController({
    clock: { now: () => NOW },
    readClientOnboarding: {
      execute: readClientOnboarding,
    } as unknown as ReadClientOnboardingUseCase,
    saveOnboardingDraft: {
      execute: saveOnboardingDraft,
    } as unknown as SaveOnboardingDraftUseCase,
    saveUnitPreference: {
      execute: saveUnitPreference,
    } as unknown as SaveUnitPreferenceUseCase,
    submitOnboarding: {
      execute: submitOnboarding,
    } as unknown as SubmitOnboardingUseCase,
  });

  return {
    controller,
    readClientOnboarding,
    saveOnboardingDraft,
    saveUnitPreference,
    submitOnboarding,
  };
}

function clientArgs(
  options: {
    body?: string;
    method?: "GET" | "POST" | "PUT";
    session?: ResolvedSession;
  } = {},
) {
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
      contextEntry(
        sessionContext,
        options.session ?? { account: CLIENT, kind: "authenticated" },
      ),
    ],
    request: new Request("https://evoa.fit/api/client-onboarding/draft", {
      body: options.body,
      headers: options.body ? { "Content-Type": "application/json" } : {},
      method: options.method ?? "GET",
    }),
  });
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}
