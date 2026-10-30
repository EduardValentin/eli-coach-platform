import type {
  ReadOwnClientAvatarUseCase,
  RemoveOwnClientAvatarUseCase,
  UploadOwnClientAvatarUseCase,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import { describe, expect, it, vi } from "vitest";
import type {
  ResolvedSession,
  SessionAccount,
} from "~/bounded-contexts/access/public/session";

import { createRequestArgs } from "~/composition-root/test-support/request-args";

import { OwnClientAvatarController } from "./own-client-avatar-controller.server";

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

const AVATAR_SNAPSHOT = {
  clientId: CLIENT_ID,
  avatarId: "avatar-1",
  reference: { storageKey: "k", keyId: "k1" },
  mimeType: "image/jpeg",
  sizeBytes: 4,
  updatedAt: new Date("2026-10-24T10:00:00.000Z"),
};

describe("OwnClientAvatarController upload", () => {
  it("hands her photo to the use case and answers that it is uploaded once it is her avatar", async () => {
    // arrange
    const { ownClientAvatarController, useCases } = createController();

    // act
    const response = await ownClientAvatarController.upload(
      accountArgs(CLIENT, avatarUpload()),
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "uploaded" });
    expect(useCases.uploadOwnClientAvatar).toHaveBeenCalledWith({
      authSubjectId: "user_ana",
      avatar: {
        mimeType: "image/jpeg",
        sizeBytes: AVATAR_BYTES.byteLength,
        bytes: AVATAR_BYTES,
      },
    });
  });

  it.each([
    [{ status: "refused", reason: "not-accepted" }, 422, "not-accepted"],
    [
      { status: "refused", reason: "rendition-refused" },
      422,
      "rendition-refused",
    ],
    [{ status: "not-on-journey" }, 404, "not-on-journey"],
    [{ status: "ended" }, 409, "ended"],
  ] as const)("answers %o with %d", async (result, status, error) => {
    // arrange
    const { ownClientAvatarController } = createController({
      uploadOwn: result,
    });

    // act
    const response = await ownClientAvatarController.upload(
      accountArgs(CLIENT, avatarUpload()),
    );

    // assert
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
  });

  it("refuses a body with no avatar part without uploading anything", async () => {
    // arrange
    const { ownClientAvatarController, useCases } = createController();

    // act
    const response = await ownClientAvatarController.upload(
      accountArgs(CLIENT, avatarUpload(new FormData())),
    );

    // assert
    expect(response.status).toBe(400);
    expect(useCases.uploadOwnClientAvatar).not.toHaveBeenCalled();
  });

  it("refuses the coach on her own route", async () => {
    // arrange
    const { ownClientAvatarController } = createController();

    // act
    const thrown = await captureThrown(() =>
      ownClientAvatarController.upload(accountArgs(COACH, avatarUpload())),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
  });
});

describe("OwnClientAvatarController remove", () => {
  it("removes her avatar and answers that it is removed", async () => {
    // arrange
    const { ownClientAvatarController, useCases } = createController();

    // act
    const response = await ownClientAvatarController.remove(
      accountArgs(CLIENT, { method: "DELETE" }),
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "removed" });
    expect(useCases.removeOwnClientAvatar).toHaveBeenCalledWith("user_ana");
  });
});

describe("OwnClientAvatarController url", () => {
  it("hands her the address of her own avatar", async () => {
    // arrange
    const { ownClientAvatarController, useCases } = createController();

    // act
    const url = await ownClientAvatarController.url(accountArgs(CLIENT));

    // assert
    expect(url).toBe(`/api/client-profile/avatar/${CLIENT_ID}?v=avatar-1`);
    expect(useCases.readOwnClientAvatar).toHaveBeenCalledWith("user_ana");
  });
});

function createController(
  results: {
    uploadOwn?: Awaited<ReturnType<UploadOwnClientAvatarUseCase["execute"]>>;
  } = {},
) {
  const useCases = {
    readOwnClientAvatar: vi.fn().mockResolvedValue(AVATAR_SNAPSHOT),
    removeOwnClientAvatar: vi.fn().mockResolvedValue({ status: "removed" }),
    uploadOwnClientAvatar: vi
      .fn()
      .mockResolvedValue(results.uploadOwn ?? { status: "uploaded" }),
  };
  const ownClientAvatarController = new OwnClientAvatarController({
    readOwnClientAvatarUseCase: {
      execute: useCases.readOwnClientAvatar,
    } as unknown as ReadOwnClientAvatarUseCase,
    removeOwnClientAvatarUseCase: {
      execute: useCases.removeOwnClientAvatar,
    } as unknown as RemoveOwnClientAvatarUseCase,
    uploadOwnClientAvatarUseCase: {
      execute: useCases.uploadOwnClientAvatar,
    } as unknown as UploadOwnClientAvatarUseCase,
  });

  return { ownClientAvatarController, useCases };
}

function avatarUpload(body?: FormData): RequestInit {
  const form =
    body ??
    (() => {
      const form = new FormData();
      form.set(
        "avatar",
        new File([AVATAR_BYTES], "me.jpg", { type: "image/jpeg" }),
      );

      return form;
    })();

  return { method: "POST", body: form };
}

function accountArgs(account: SessionAccount, init: RequestInit = {}) {
  const portal = {
    appBasePath: "/",
    publicAppUrl: "https://evoa.fit",
    signInUrl: "https://accounts.evoa.fit/sign-in",
  };
  const session: ResolvedSession = { account, kind: "authenticated" };

  return createRequestArgs({
    portal,
    session,
    request: new Request("https://evoa.fit/api/client-profile/avatar", init),
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
