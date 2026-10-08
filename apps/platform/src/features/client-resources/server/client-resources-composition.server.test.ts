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

const CLIENT: AccountSnapshot = {
  authSubjectId: "user_ana",
  id: "acct_ana",
  role: "CLIENT",
};

const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";

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

  it("looks a resource whose details change up in the clients' resources table", async () => {
    // arrange
    const feature = composeClientResourcesFeature(createHandles());
    const request = new Request(
      `https://evoa.fit/api/client-resources/${RESOURCE_ID}`,
      {
        body: JSON.stringify({ title: "Week two plan", description: "" }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      },
    );

    // act
    const changing = feature.clientResources.changeDetails(
      coachArgs(request),
      RESOURCE_ID,
    );

    // assert
    await expect(changing).rejects.toThrow("database down");
  });

  it("looks a resource being removed up in the clients' resources table", async () => {
    // arrange
    const feature = composeClientResourcesFeature(createHandles());
    const request = new Request(
      `https://evoa.fit/api/client-resources/${RESOURCE_ID}`,
      { method: "DELETE" },
    );

    // act
    const removing = feature.clientResources.remove(
      coachArgs(request),
      RESOURCE_ID,
    );

    // assert
    await expect(removing).rejects.toThrow("database down");
  });
});

describe("composeClientResourcesFeature, for the client herself", () => {
  it("lists her own resources from the clients' resources table and reports a failed read", async () => {
    // arrange
    const handles = createHandles();
    handles.resourceClients.findByAuthSubjectId.mockResolvedValue({
      clientId: CLIENT_ID,
      portal: "reachable",
    });
    const feature = composeClientResourcesFeature(handles);

    // act
    const listing = await feature.ownResources.load(clientArgs());

    // assert
    expect(listing).toEqual({ status: "unavailable" });
    expect(handles.incidents.resourceListingFailed).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      error: new Error("database down"),
    });
  });

  it("counts her unopened resources in the clients' resources table and reports a failed count", async () => {
    // arrange
    const handles = createHandles();
    handles.resourceClients.findByAuthSubjectId.mockResolvedValue({
      clientId: CLIENT_ID,
      portal: "reachable",
    });
    const feature = composeClientResourcesFeature(handles);

    // act
    const count = await feature.ownResources.countUnopened(clientArgs());

    // assert
    expect(count).toBe(0);
    expect(handles.incidents.unopenedCountFailed).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      error: new Error("database down"),
    });
  });

  it("looks the resource she opened up in the clients' resources table", async () => {
    // arrange
    const handles = createHandles();
    handles.resourceClients.findByAuthSubjectId.mockResolvedValue({
      clientId: CLIENT_ID,
      portal: "reachable",
    });
    const feature = composeClientResourcesFeature(handles);

    // act
    const marking = feature.ownResources.markOpened(clientArgs(), RESOURCE_ID);

    // assert
    await expect(marking).rejects.toThrow("database down");
  });
});

function createHandles() {
  return {
    clock: { now: () => new Date("2026-10-05T09:30:00.000Z") },
    database: createUnreachableDatabase(),
    documentPages: { read: vi.fn() },
    fileFormats: { detect: vi.fn() },
    imagePages: { render: vi.fn() },
    incidents: {
      resourceStored: vi.fn(),
      resourceRefused: vi.fn(),
      resourceAccessRefused: vi.fn(),
      resourceStorageFailed: vi.fn(),
      resourceListingFailed: vi.fn(),
      resourceOpeningFailed: vi.fn(),
      resourceChangeFailed: vi.fn(),
      resourceFilesOrphaned: vi.fn(),
      unopenedCountFailed: vi.fn(),
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

function coachArgs(
  request = new Request(
    `https://evoa.fit/coach/clients/${UNKNOWN_CLIENT_ID}/resources`,
  ),
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
      contextEntry(sessionContext, { account: COACH, kind: "authenticated" }),
    ],
    request,
  });
}

function clientArgs() {
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
    request: new Request("https://evoa.fit/client/resources"),
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
