import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import type {
  ListClientAvatarsUseCase,
  OpenClientAvatarUseCase,
  ReadOwnClientAvatarUseCase,
  RemoveClientAvatarAsCoachUseCase,
  RemoveOwnClientAvatarUseCase,
  UploadClientAvatarAsCoachUseCase,
  UploadOwnClientAvatarUseCase,
} from "@eli-coach-platform/domain/client-profile";
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

import { ClientAvatarController } from "./client-avatar-controller.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const OTHER_CLIENT_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
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

const AVATAR_SNAPSHOT = {
  clientId: CLIENT_ID,
  avatarId: "avatar-1",
  reference: { storageKey: "k", keyId: "k1" },
  mimeType: "image/jpeg",
  sizeBytes: 4,
  updatedAt: new Date("2026-10-24T10:00:00.000Z"),
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
});

describe("ClientAvatarController uploadOwn", () => {
  it("hands her photo to the use case and answers no content once it is her avatar", async () => {
    // arrange
    const { controller, useCases } = createController();

    // act
    const response = await controller.uploadOwn(
      accountArgs(CLIENT, avatarUpload()),
    );

    // assert
    expect(response.status).toBe(204);
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
    const { controller } = createController({ uploadOwn: result });

    // act
    const response = await controller.uploadOwn(
      accountArgs(CLIENT, avatarUpload()),
    );

    // assert
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
  });

  it("refuses a body with no avatar part without uploading anything", async () => {
    // arrange
    const { controller, useCases } = createController();

    // act
    const response = await controller.uploadOwn(
      accountArgs(CLIENT, avatarUpload(new FormData())),
    );

    // assert
    expect(response.status).toBe(400);
    expect(useCases.uploadOwnClientAvatar).not.toHaveBeenCalled();
  });

  it("refuses the coach on her own route", async () => {
    // arrange
    const { controller } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.uploadOwn(accountArgs(COACH, avatarUpload())),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
  });
});

describe("ClientAvatarController coach writes", () => {
  it("uploads and removes a client's avatar for the coach", async () => {
    // arrange
    const { controller, useCases } = createController();

    // act
    const uploaded = await controller.uploadAsCoach(
      accountArgs(COACH, avatarUpload()),
      CLIENT_ID,
    );
    const removed = await controller.removeAsCoach(
      accountArgs(COACH, { method: "DELETE" }),
      CLIENT_ID,
    );

    // assert
    expect([uploaded.status, removed.status]).toEqual([204, 204]);
    expect(useCases.uploadClientAvatarAsCoach).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: CLIENT_ID }),
    );
    expect(useCases.removeClientAvatarAsCoach).toHaveBeenCalledWith(CLIENT_ID);
  });

  it("refuses a client on the coach's routes", async () => {
    // arrange
    const { controller } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.removeAsCoach(
        accountArgs(CLIENT, { method: "DELETE" }),
        CLIENT_ID,
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
  });
});

describe("ClientAvatarController removeOwn", () => {
  it("removes her avatar and answers no content", async () => {
    // arrange
    const { controller, useCases } = createController();

    // act
    const response = await controller.removeOwn(
      accountArgs(CLIENT, { method: "DELETE" }),
    );

    // assert
    expect(response.status).toBe(204);
    expect(useCases.removeOwnClientAvatar).toHaveBeenCalledWith("user_ana");
  });
});

describe("ClientAvatarController addresses", () => {
  it("hands the coach an avatar address for each client that has one", async () => {
    // arrange
    const { controller } = createController();

    // act
    const urls = await controller.urlsFor(accountArgs(COACH), [
      CLIENT_ID,
      OTHER_CLIENT_ID,
    ]);

    // assert
    expect(urls).toEqual({
      [CLIENT_ID]: `/api/client-profile/avatar/${CLIENT_ID}`,
      [OTHER_CLIENT_ID]: null,
    });
  });

  it("hands her the address of her own avatar", async () => {
    // arrange
    const { controller, useCases } = createController();

    // act
    const url = await controller.ownUrl(accountArgs(CLIENT));

    // assert
    expect(url).toBe(`/api/client-profile/avatar/${CLIENT_ID}`);
    expect(useCases.readOwnClientAvatar).toHaveBeenCalledWith("user_ana");
  });
});

function createController(
  results: {
    uploadOwn?: Awaited<ReturnType<UploadOwnClientAvatarUseCase["execute"]>>;
  } = {},
) {
  const useCases = {
    listClientAvatars: vi.fn().mockResolvedValue([AVATAR_SNAPSHOT]),
    openClientAvatar: vi.fn().mockResolvedValue({
      status: "opened",
      bytes: AVATAR_BYTES,
      mimeType: "image/jpeg",
    }),
    readOwnClientAvatar: vi.fn().mockResolvedValue(AVATAR_SNAPSHOT),
    removeClientAvatarAsCoach: vi.fn().mockResolvedValue({ status: "removed" }),
    removeOwnClientAvatar: vi.fn().mockResolvedValue({ status: "removed" }),
    uploadClientAvatarAsCoach: vi
      .fn()
      .mockResolvedValue({ status: "uploaded" }),
    uploadOwnClientAvatar: vi
      .fn()
      .mockResolvedValue(results.uploadOwn ?? { status: "uploaded" }),
  };
  const controller = new ClientAvatarController({
    listClientAvatars: {
      execute: useCases.listClientAvatars,
    } as unknown as ListClientAvatarsUseCase,
    openClientAvatar: {
      execute: useCases.openClientAvatar,
    } as unknown as OpenClientAvatarUseCase,
    readOwnClientAvatar: {
      execute: useCases.readOwnClientAvatar,
    } as unknown as ReadOwnClientAvatarUseCase,
    removeClientAvatarAsCoach: {
      execute: useCases.removeClientAvatarAsCoach,
    } as unknown as RemoveClientAvatarAsCoachUseCase,
    removeOwnClientAvatar: {
      execute: useCases.removeOwnClientAvatar,
    } as unknown as RemoveOwnClientAvatarUseCase,
    uploadClientAvatarAsCoach: {
      execute: useCases.uploadClientAvatarAsCoach,
    } as unknown as UploadClientAvatarAsCoachUseCase,
    uploadOwnClientAvatar: {
      execute: useCases.uploadOwnClientAvatar,
    } as unknown as UploadOwnClientAvatarUseCase,
  });

  return { controller, useCases };
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

function accountArgs(account: AccountSnapshot, init: RequestInit = {}) {
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
