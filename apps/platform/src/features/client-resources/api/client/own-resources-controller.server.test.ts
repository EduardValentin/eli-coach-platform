import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import {
  ClientResource,
  type CountUnopenedResourcesUseCase,
  type ListOwnResourcesUseCase,
  type MarkResourceOpenedUseCase,
  type ResourceBrowseSnapshot,
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

import { OwnResourcesController } from "./own-resources-controller.server";

const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const NEW_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const OPENED_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";

const ANA: AccountSnapshot = {
  authSubjectId: "user_ana",
  id: "acct_ana",
  role: "CLIENT",
};

const CLIENT_SESSION: ResolvedSession = { account: ANA, kind: "authenticated" };

const COACH_SESSION: ResolvedSession = {
  account: { authSubjectId: "user_eli", id: "acct_eli", role: "COACH" },
  kind: "authenticated",
};

const ANONYMOUS_SESSION: ResolvedSession = { kind: "anonymous" };

const EMPTY_LISTING = {
  status: "listed",
  browsing: { resources: [], tagOptions: [], searched: 0, total: 0 },
  browse: { tag: null, search: "", sort: "added", direction: "desc" },
} satisfies Awaited<ReturnType<ListOwnResourcesUseCase["execute"]>>;

const NEW_PDF = ClientResource.reconstitute({
  id: NEW_ID,
  clientId: CLIENT_ID,
  title: "Meal plan",
  description: "Week one",
  tags: [
    { tag: "Meals", folded: "meals" },
    { tag: "Week one", folded: "week one" },
  ],
  file: {
    originalName: "Meal plan.pdf",
    format: "pdf",
    sizeBytes: 182_431,
    pageCount: 3,
  },
  addedAt: new Date("2026-10-05T09:30:00.000Z"),
  openedAt: null,
});

const OPENED_DOCUMENT = ClientResource.reconstitute({
  id: OPENED_ID,
  clientId: CLIENT_ID,
  title: "Recipes",
  description: "",
  tags: [],
  file: {
    originalName: "Recipes.docx",
    format: "docx",
    sizeBytes: 9_120,
    pageCount: null,
  },
  addedAt: new Date("2026-10-04T08:00:00.000Z"),
  openedAt: new Date("2026-10-04T18:00:00.000Z"),
});

const NARROWED_BROWSE: ResourceBrowseSnapshot = {
  tag: { tag: "Meals", folded: "meals" },
  search: "plan",
  sort: "title",
  direction: "desc",
};

describe("OwnResourcesController load", () => {
  it("hands the client her own resources narrowed as listed, with her tag options, the browse it applied and the counts", async () => {
    // arrange
    const { controller } = createController({
      listed: {
        status: "listed",
        browsing: {
          resources: [NEW_PDF, OPENED_DOCUMENT],
          tagOptions: [
            { tag: { tag: "Meals", folded: "meals" }, count: 1 },
            { tag: { tag: "Week one", folded: "week one" }, count: 0 },
          ],
          searched: 2,
          total: 5,
        },
        browse: NARROWED_BROWSE,
      },
    });

    // act
    const listing = await controller.load(clientArgs());

    // assert
    expect(listing).toEqual({
      status: "ready",
      resources: [
        {
          id: NEW_ID,
          title: "Meal plan",
          description: "Week one",
          tags: ["Meals", "Week one"],
          file: {
            originalName: "Meal plan.pdf",
            downloadName: "Meal plan.pdf",
            kind: "pdf",
            sizeBytes: 182_431,
            pageCount: 3,
          },
          addedAt: "2026-10-05T09:30:00.000Z",
          openedAt: null,
        },
        {
          id: OPENED_ID,
          title: "Recipes",
          description: "",
          tags: [],
          file: {
            originalName: "Recipes.docx",
            downloadName: "Recipes.docx",
            kind: "word",
            sizeBytes: 9_120,
            pageCount: null,
          },
          addedAt: "2026-10-04T08:00:00.000Z",
          openedAt: "2026-10-04T18:00:00.000Z",
        },
      ],
      tagOptions: [
        { tag: "Meals", count: 1 },
        { tag: "Week one", count: 0 },
      ],
      browse: {
        tag: "Meals",
        search: "plan",
        sort: "title",
        direction: "desc",
      },
      searched: 2,
      total: 5,
    });
  });

  it("lists her resources as the address narrows them, read raw", async () => {
    // arrange
    const { controller, listOwnResources } = createController();

    // act
    await controller.load(
      clientArgs({
        url: "https://evoa.fit/client/resources?tag=MEALS&q=50%25&sort=title&dir=up",
      }),
    );

    // assert
    expect(listOwnResources).toHaveBeenCalledWith({
      requester: { role: "CLIENT", authSubjectId: "user_ana" },
      browse: { tag: "MEALS", search: "50%", sort: "title", direction: "up" },
    });
  });

  it("lists every resource of hers when the address narrows nothing", async () => {
    // arrange
    const { controller, listOwnResources } = createController();

    // act
    const listing = await controller.load(clientArgs());

    // assert
    expect(listOwnResources).toHaveBeenCalledWith({
      requester: { role: "CLIENT", authSubjectId: "user_ana" },
      browse: { tag: null, search: null, sort: null, direction: null },
    });
    expect(listing).toEqual({
      status: "ready",
      resources: [],
      tagOptions: [],
      browse: { tag: null, search: "", sort: "added", direction: "desc" },
      searched: 0,
      total: 0,
    });
  });

  it("answers an unavailable listing when her resources are unavailable", async () => {
    // arrange
    const { controller } = createController({
      listed: { status: "unavailable" },
    });

    // act
    const listing = await controller.load(clientArgs());

    // assert
    expect(listing).toEqual({ status: "unavailable" });
  });

  it("answers not found when she reaches no resources", async () => {
    // arrange
    const { controller } = createController({
      listed: { status: "not-found" },
    });

    // act
    const thrown = await captureThrown(() => controller.load(clientArgs()));

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("refuses the coach without listing anything", async () => {
    // arrange
    const { controller, listOwnResources } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.load(clientArgs({ session: COACH_SESSION })),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(listOwnResources).not.toHaveBeenCalled();
  });

  it("sends an anonymous visitor to sign in without listing anything", async () => {
    // arrange
    const { controller, listOwnResources } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.load(clientArgs({ session: ANONYMOUS_SESSION })),
    );

    // assert
    expect((thrown as Response).status).toBe(302);
    expect(listOwnResources).not.toHaveBeenCalled();
  });
});

describe("OwnResourcesController countUnopened", () => {
  it("answers how many of her resources she has not opened", async () => {
    // arrange
    const { controller, countUnopenedResources } = createController({
      unopened: 2,
    });

    // act
    const count = await controller.countUnopened(clientArgs());

    // assert
    expect(count).toBe(2);
    expect(countUnopenedResources).toHaveBeenCalledWith({
      role: "CLIENT",
      authSubjectId: "user_ana",
    });
  });

  it("counts nothing for a visitor who is not signed in, without asking", async () => {
    // arrange
    const { controller, countUnopenedResources } = createController({
      unopened: 2,
    });

    // act
    const count = await controller.countUnopened(
      clientArgs({ session: ANONYMOUS_SESSION }),
    );

    // assert
    expect(count).toBe(0);
    expect(countUnopenedResources).not.toHaveBeenCalled();
  });
});

describe("OwnResourcesController markOpened", () => {
  it("answers that her resource is opened once it is marked", async () => {
    // arrange
    const { controller, markResourceOpened } = createController({
      marked: { status: "opened" },
    });

    // act
    const response = await controller.markOpened(markArgs(), NEW_ID);

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "opened" });
    expect(markResourceOpened).toHaveBeenCalledWith({
      requester: { role: "CLIENT", authSubjectId: "user_ana" },
      resourceId: NEW_ID,
    });
  });

  it("answers not found to a resource she does not reach", async () => {
    // arrange
    const { controller } = createController({
      marked: { status: "not-found" },
    });

    // act
    const response = await controller.markOpened(markArgs(), NEW_ID);

    // assert
    expect(response.status).toBe(404);
  });

  it("answers a server error when the mark could not be kept", async () => {
    // arrange
    const { controller } = createController({ marked: { status: "failed" } });

    // act
    const response = await controller.markOpened(markArgs(), NEW_ID);

    // assert
    expect(response.status).toBe(500);
  });

  it("answers not found to a resource id that is not a uuid without marking anything", async () => {
    // arrange
    const { controller, markResourceOpened } = createController();

    // act
    const response = await controller.markOpened(markArgs(), "../etc/passwd");

    // assert
    expect(response.status).toBe(404);
    expect(markResourceOpened).not.toHaveBeenCalled();
  });

  it.each([
    { who: "the coach", session: COACH_SESSION, status: 403 },
    {
      who: "a visitor who is not signed in",
      session: ANONYMOUS_SESSION,
      status: 401,
    },
  ])("refuses $who without marking anything", async ({ session, status }) => {
    // arrange
    const { controller, markResourceOpened } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.markOpened(markArgs({ session }), NEW_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(status);
    expect(markResourceOpened).not.toHaveBeenCalled();
  });
});

function createController(
  answers: {
    listed?: Awaited<ReturnType<ListOwnResourcesUseCase["execute"]>>;
    unopened?: number;
    marked?: Awaited<ReturnType<MarkResourceOpenedUseCase["execute"]>>;
  } = {},
) {
  const listOwnResources = vi
    .fn()
    .mockResolvedValue(answers.listed ?? EMPTY_LISTING);
  const countUnopenedResources = vi
    .fn()
    .mockResolvedValue(answers.unopened ?? 0);
  const markResourceOpened = vi
    .fn()
    .mockResolvedValue(answers.marked ?? { status: "opened" });
  const controller = new OwnResourcesController({
    listOwnResources: {
      execute: listOwnResources,
    } as unknown as ListOwnResourcesUseCase,
    countUnopenedResources: {
      execute: countUnopenedResources,
    } as unknown as CountUnopenedResourcesUseCase,
    markResourceOpened: {
      execute: markResourceOpened,
    } as unknown as MarkResourceOpenedUseCase,
  });

  return {
    controller,
    listOwnResources,
    countUnopenedResources,
    markResourceOpened,
  };
}

function clientArgs(options: { session?: ResolvedSession; url?: string } = {}) {
  return argsFor({
    session: options.session ?? CLIENT_SESSION,
    request: new Request(options.url ?? "https://evoa.fit/client/resources"),
  });
}

function markArgs(options: { session?: ResolvedSession } = {}) {
  return argsFor({
    session: options.session ?? CLIENT_SESSION,
    request: new Request(
      `https://evoa.fit/api/client-resources/${NEW_ID}/opened`,
      { method: "POST" },
    ),
  });
}

function argsFor(options: { session: ResolvedSession; request: Request }) {
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
      contextEntry(sessionContext, options.session),
    ],
    request: options.request,
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
