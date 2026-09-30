import type { DatabaseClient } from "@eli-coach-platform/db";
import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
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

  it("refuses a submission from an account with no client record without stamping anything", async () => {
    // arrange
    const handles = createHandles();
    const { controller } = composeClientOnboardingFeature(handles);

    // act
    const response = await controller.submit(
      clientArgs({
        method: "POST",
        body: { answers: emptyAnswers(), consents: noConsents() },
      }),
    );

    // assert
    expect(response.status).toBe(404);
    expect(
      handles.onboardingSubmissionStamps.recordOnboardingSubmitted,
    ).not.toHaveBeenCalled();
  });

  it("refuses units from an account with no client record through the same client reader", async () => {
    // arrange
    const handles = createHandles();
    const { controller } = composeClientOnboardingFeature(handles);

    // act
    const response = await controller.saveUnitPreference(
      clientArgs({
        method: "PUT",
        body: { weightUnit: "lb", heightUnit: "ft-in" },
      }),
    );

    // assert
    expect(response.status).toBe(404);
    expect(handles.onboardingClients.findByAuthSubjectId).toHaveBeenCalledWith(
      "user_uninvited",
    );
  });
});

function createHandles() {
  return {
    clock: { now: () => new Date("2026-09-28T10:00:00.000Z") },
    database: createUnreachableDatabase(),
    incidents: {
      onboardingDraftSaveFailed: vi.fn(),
      onboardingDraftSaved: vi.fn(),
      onboardingSubmissionAccepted: vi.fn(),
      onboardingSubmissionRefused: vi.fn(),
    },
    onboardingClients: { findByAuthSubjectId: vi.fn().mockResolvedValue(null) },
    onboardingSubmissionStamps: {
      recordOnboardingSubmitted: vi.fn().mockResolvedValue(undefined),
    },
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

function clientArgs(
  request: { method?: "GET" | "POST" | "PUT"; body?: unknown } = {},
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
      contextEntry(sessionContext, { account: CLIENT, kind: "authenticated" }),
    ],
    request: new Request("https://evoa.fit/client/onboarding", {
      body:
        request.body === undefined ? undefined : JSON.stringify(request.body),
      headers: { "Content-Type": "application/json" },
      method: request.method ?? "GET",
    }),
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
