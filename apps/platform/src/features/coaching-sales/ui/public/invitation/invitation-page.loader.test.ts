import { describe, expect, it } from "vitest";

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

import { loader, meta } from "./invitation-page";

describe("invitation page loader", () => {
  it("tells an anonymous visitor's page to resolve the invitation", () => {
    // arrange
    const args = loaderArguments({ kind: "anonymous" });

    // act
    const loaded = loader(args);

    // assert
    expect(loaded).toEqual({
      invitationPath: "/eli-coach-platform/invitation",
      signedIn: false,
    });
  });

  it("tells a signed-in visitor's page to ask for a sign-out that returns to the invitation", () => {
    // arrange
    const args = loaderArguments({
      account: { authSubjectId: "user_coach", id: "acct_1", role: "COACH" },
      kind: "authenticated",
    });

    // act
    const loaded = loader(args);

    // assert
    expect(loaded).toEqual({
      invitationPath: "/eli-coach-platform/invitation",
      signedIn: true,
    });
  });

  it("keeps the invitation page out of search results", () => {
    // arrange
    const describePage = meta;

    // act
    const tags = describePage({} as Parameters<typeof meta>[0]);

    // assert
    expect(tags).toEqual([
      { title: "Your invitation | Evoa" },
      { name: "robots", content: "noindex" },
    ]);
  });
});

function loaderArguments(session: ResolvedSession) {
  const accounts = {
    portal: { appBasePath: "/eli-coach-platform" },
  } as unknown as AccountsFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(accountsContext, accounts),
      contextEntry(sessionContext, session),
    ],
    request: new Request("http://localhost/eli-coach-platform/invitation"),
  });
}
