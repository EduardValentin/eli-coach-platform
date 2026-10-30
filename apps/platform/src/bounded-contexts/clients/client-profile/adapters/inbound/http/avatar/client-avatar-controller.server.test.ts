import type { OpenClientAvatarUseCase } from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import { describe, expect, it, vi } from "vitest";
import type {
  ResolvedSession,
  SessionAccount,
} from "~/bounded-contexts/access/public/session";

import { createRequestArgs } from "~/composition-root/test-support/request-args";

import { ClientAvatarController } from "./client-avatar-controller.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const AVATAR_BYTES = new Uint8Array([255, 216, 255, 224]);

const CLIENT: SessionAccount = {
  authSubjectId: "user_ana",
  id: "acct_ana",
  role: "CLIENT",
};

const COACH: SessionAccount = {
  authSubjectId: "user_eli",
  id: "acct_eli",
  role: "COACH",
};

describe("ClientAvatarController open", () => {
  it("serves her avatar inline and privately to the requester the use case lets see it", async () => {
    // arrange
    const { clientAvatarController, useCases } = createController();

    // act
    const response = await clientAvatarController.open(
      accountArgs(COACH),
      CLIENT_ID,
    );

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
    const { clientAvatarController, useCases } = createController();

    // act
    const response = await clientAvatarController.open(
      accountArgs(COACH),
      "nope",
    );

    // assert
    expect(response.status).toBe(404);
    expect(useCases.openClientAvatar).not.toHaveBeenCalled();
  });

  it("serves her current avatar whatever version its address names", async () => {
    // arrange
    const { clientAvatarController, useCases } = createController();

    // act
    const response = await clientAvatarController.open(
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
  const clientAvatarController = new ClientAvatarController({
    openClientAvatarUseCase: {
      execute: useCases.openClientAvatar,
    } as unknown as OpenClientAvatarUseCase,
  });

  return { clientAvatarController, useCases };
}

function accountArgs(
  account: SessionAccount,
  init: RequestInit = {},
  url = "https://evoa.fit/api/client-profile/avatar",
) {
  const portal = {
    appBasePath: "/",
    publicAppUrl: "https://evoa.fit",
    signInUrl: "https://accounts.evoa.fit/sign-in",
  };
  const session: ResolvedSession = { account, kind: "authenticated" };

  return createRequestArgs({
    portal,
    session,
    request: new Request(url, init),
  });
}
