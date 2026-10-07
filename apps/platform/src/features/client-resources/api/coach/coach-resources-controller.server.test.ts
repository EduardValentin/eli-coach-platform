import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import {
  ClientResource,
  type ClientResourceSnapshot,
  type ListClientResourcesResult,
  type ListClientResourcesUseCase,
} from "@eli-coach-platform/domain/client-resources";
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

import { CoachResourcesController } from "./coach-resources-controller.server";

const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const NEWER_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const OLDER_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";

const COACH: AccountSnapshot = {
  authSubjectId: "user_eli",
  id: "acct_eli",
  role: "COACH",
};

const CLIENT_SESSION: ResolvedSession = {
  account: { authSubjectId: "user_ana", id: "acct_ana", role: "CLIENT" },
  kind: "authenticated",
};

const ANONYMOUS_SESSION: ResolvedSession = { kind: "anonymous" };

const NEWER_PDF: ClientResourceSnapshot = {
  id: NEWER_ID,
  clientId: CLIENT_ID,
  title: "Meal plan",
  description: "Week one",
  file: {
    originalName: "Meal plan.pdf",
    format: "pdf",
    sizeBytes: 182_431,
    pageCount: 3,
  },
  addedAt: new Date("2026-10-05T09:30:00.000Z"),
  openedAt: new Date("2026-10-06T07:15:00.000Z"),
};

const OLDER_SPREADSHEET: ClientResourceSnapshot = {
  id: OLDER_ID,
  clientId: CLIENT_ID,
  title: "Macros",
  description: "",
  file: {
    originalName: "macros",
    format: "ods",
    sizeBytes: 9_120,
    pageCount: null,
  },
  addedAt: new Date("2026-10-04T08:00:00.000Z"),
  openedAt: null,
};

describe("CoachResourcesController load", () => {
  it("hands the coach the client's resources in the order they were listed, as the page reads them, each named for its real format", async () => {
    // arrange
    const { controller, listClientResources } = createController({
      status: "listed",
      resources: [NEWER_PDF, OLDER_SPREADSHEET].map(
        ClientResource.reconstitute,
      ),
    });

    // act
    const listing = await controller.load(coachArgs(), CLIENT_ID);

    // assert
    expect(listing).toEqual({
      status: "ready",
      resources: [
        {
          id: NEWER_ID,
          title: "Meal plan",
          description: "Week one",
          file: {
            originalName: "Meal plan.pdf",
            downloadName: "Meal plan.pdf",
            kind: "pdf",
            sizeBytes: 182_431,
            pageCount: 3,
          },
          addedAt: "2026-10-05T09:30:00.000Z",
          openedAt: "2026-10-06T07:15:00.000Z",
        },
        {
          id: OLDER_ID,
          title: "Macros",
          description: "",
          file: {
            originalName: "macros",
            downloadName: "macros.ods",
            kind: "excel",
            sizeBytes: 9_120,
            pageCount: null,
          },
          addedAt: "2026-10-04T08:00:00.000Z",
          openedAt: null,
        },
      ],
    });
    expect(listClientResources).toHaveBeenCalledWith({
      requester: { role: "COACH", authSubjectId: "user_eli" },
      clientId: CLIENT_ID,
    });
  });

  it("answers an unavailable listing when the client's resources are unavailable", async () => {
    // arrange
    const { controller } = createController({ status: "unavailable" });

    // act
    const listing = await controller.load(coachArgs(), CLIENT_ID);

    // assert
    expect(listing).toEqual({ status: "unavailable" });
  });

  it("answers not found to a client who does not exist", async () => {
    // arrange
    const { controller } = createController({ status: "not-found" });

    // act
    const thrown = await captureThrown(() =>
      controller.load(coachArgs(), CLIENT_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("answers not found to an id that is not a uuid without listing anything", async () => {
    // arrange
    const { controller, listClientResources } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.load(coachArgs(), "not-a-uuid"),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
    expect(listClientResources).not.toHaveBeenCalled();
  });

  it("refuses a client account without listing anything", async () => {
    // arrange
    const { controller, listClientResources } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.load(coachArgs({ session: CLIENT_SESSION }), CLIENT_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(listClientResources).not.toHaveBeenCalled();
  });

  it("sends an anonymous visitor to sign in without listing anything", async () => {
    // arrange
    const { controller, listClientResources } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.load(coachArgs({ session: ANONYMOUS_SESSION }), CLIENT_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(302);
    expect(listClientResources).not.toHaveBeenCalled();
  });
});

function createController(
  listed: ListClientResourcesResult = { status: "listed", resources: [] },
) {
  const listClientResources = vi.fn().mockResolvedValue(listed);
  const controller = new CoachResourcesController({
    listClientResources: {
      execute: listClientResources,
    } as unknown as ListClientResourcesUseCase,
  });

  return { controller, listClientResources };
}

function coachArgs(options: { session?: ResolvedSession } = {}) {
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
        options.session ?? { account: COACH, kind: "authenticated" },
      ),
    ],
    request: new Request(
      `https://evoa.fit/coach/clients/${CLIENT_ID}/resources`,
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
