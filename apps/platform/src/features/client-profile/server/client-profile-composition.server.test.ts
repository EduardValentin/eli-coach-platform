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

import { composeClientProfileFeature } from "./client-profile-composition.server";

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

describe("composeClientProfileFeature", () => {
  it("refuses units from an account with no client record through the client reader it is handed", async () => {
    // arrange
    const handles = createHandles();
    const { feature } = composeClientProfileFeature(handles);

    // act
    const response = await feature.unitPreference.save(
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
    expect(
      handles.unitPreferenceClients.findByAuthSubjectId,
    ).toHaveBeenCalledWith("user_uninvited");
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
});

function createHandles() {
  return {
    clientIdentities: { findByClientId: vi.fn().mockResolvedValue(null) },
    clock: { now: () => new Date("2026-09-28T10:00:00.000Z") },
    database: createUnreachableDatabase(),
    unitPreferenceClients: {
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
    },
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
