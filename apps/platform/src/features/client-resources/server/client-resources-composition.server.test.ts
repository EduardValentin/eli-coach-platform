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

import { composeClientResourcesFeature } from "./client-resources-composition.server";

const COACH: AccountSnapshot = {
  authSubjectId: "user_coach",
  id: "acct_coach",
  role: "COACH",
};

const UNKNOWN_CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const RESOURCE_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

describe("composeClientResourcesFeature", () => {
  it("answers not found for a client the resource clients it is handed do not know", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeClientResourcesFeature(handles);

    // act
    const thrown = await captureThrown(() =>
      feature.coachResources.load(coachArgs(), UNKNOWN_CLIENT_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
    expect(handles.resourceClients.exists).toHaveBeenCalledWith(
      UNKNOWN_CLIENT_ID,
    );
  });

  it("looks a served resource up in the clients' resources table", async () => {
    // arrange
    const feature = composeClientResourcesFeature(createHandles());

    // act
    const opening = feature.clientResources.download(coachArgs(), RESOURCE_ID);

    // assert
    await expect(opening).rejects.toThrow("database down");
  });
});

function createHandles() {
  return {
    clock: { now: () => new Date("2026-10-05T09:30:00.000Z") },
    database: createUnreachableDatabase(),
    documentPages: { read: vi.fn() },
    imagePages: { render: vi.fn() },
    incidents: {
      resourceStored: vi.fn(),
      resourceRefused: vi.fn(),
      resourceAccessRefused: vi.fn(),
      resourceStorageFailed: vi.fn(),
    },
    resourceClients: {
      exists: vi.fn().mockResolvedValue(false),
      findByAuthSubjectId: vi.fn().mockResolvedValue(null),
    },
    store: {
      storeOriginal: vi.fn(),
      storePage: vi.fn(),
      storeThumbnail: vi.fn(),
      openOriginal: vi.fn(),
      openPage: vi.fn(),
      openThumbnail: vi.fn(),
      remove: vi.fn(),
    },
  };
}

function createUnreachableDatabase(): DatabaseClient {
  return {
    select: () => {
      throw new Error("database down");
    },
  } as unknown as DatabaseClient;
}

function coachArgs() {
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
      contextEntry(sessionContext, { account: COACH, kind: "authenticated" }),
    ],
    request: new Request(
      `https://evoa.fit/coach/clients/${UNKNOWN_CLIENT_ID}/resources`,
    ),
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
