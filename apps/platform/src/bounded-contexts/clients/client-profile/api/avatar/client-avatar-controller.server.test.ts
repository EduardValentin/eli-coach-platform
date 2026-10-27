import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import type { OpenClientAvatarUseCase } from "@eli-coach-platform/domain/client-profile";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/bounded-contexts/access/accounts/server/accounts-composition.server";
import { accountsContext } from "~/bounded-contexts/access/accounts/server/guards/accounts-context.server";
import {
  sessionContext,
  type ResolvedSession,
} from "~/bounded-contexts/access/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { ClientAvatarController } from "./client-avatar-controller.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const AVATAR_BYTES = new Uint8Array([255, 216, 255, 224]);

const CLIENT: AccountSnapshot = {
  authSubjectId: "user_ana",
  id: "acct_ana",
  role: "CLIENT",
};

const COACH: AccountSnapshot = {
  authSubjectId: "user_eli",
  id: "acct_eli",
  role: "COACH",
};

describe("ClientAvatarController open", () => {
  it("serves her avatar inline and privately to the requester the use case lets see it", async () => {
    // arrange
    const { controller, useCases } = createController();

    // act
    const response = await controller.open(accountArgs(COACH), CLIENT_ID);

    // assert
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(AVATAR_BYTES);
    expect(useCases.openClientAvatar).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      requester: { role: "COACH", authSubjectId: "user_eli" },
    });
  });

  it("answers not found to an id that is not a uuid without opening anything", async () => {
    // arrange
    const { controller, useCases } = createController();

    // act
    const response = await controller.open(accountArgs(COACH), "nope");

    // assert
    expect(response.status).toBe(404);
    expect(useCases.openClientAvatar).not.toHaveBeenCalled();
  });

  it("serves her current avatar whatever version its address names", async () => {
    // arrange
    const { controller, useCases } = createController();

    // act
    const response = await controller.open(
      accountArgs(
        COACH,
        {},
        `https://evoa.fit/api/client-profile/avatar/${CLIENT_ID}?v=avatar-0`,
      ),
      CLIENT_ID,
    );

    // assert
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(useCases.openClientAvatar).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: CLIENT_ID }),
    );
  });
});

function createController() {
  const useCases = {
    openClientAvatar: vi.fn().mockResolvedValue({
      status: "opened",
      bytes: AVATAR_BYTES,
      mimeType: "image/jpeg",
    }),
  };
  const controller = new ClientAvatarController({
    openClientAvatar: {
      execute: useCases.openClientAvatar,
    } as unknown as OpenClientAvatarUseCase,
  });

  return { controller, useCases };
}

function accountArgs(
  account: AccountSnapshot,
  init: RequestInit = {},
  url = "https://evoa.fit/api/client-profile/avatar",
) {
  const accounts = {
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
  } as unknown as AccountsFeature;
  const session: ResolvedSession = { account, kind: "authenticated" };

  return createRequestArgs({
    contexts: [
      contextEntry(accountsContext, accounts),
      contextEntry(sessionContext, session),
    ],
    request: new Request(url, init),
  });
}
