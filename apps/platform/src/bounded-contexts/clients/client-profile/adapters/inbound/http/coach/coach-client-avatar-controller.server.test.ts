import type {
  ListClientAvatarsUseCase,
  RemoveClientAvatarAsCoachUseCase,
  UploadClientAvatarAsCoachUseCase,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import { describe, expect, it, vi } from "vitest";
import type {
  ResolvedSession,
  SessionAccount,
} from "~/bounded-contexts/access/public/session";

import { createRequestArgs } from "~/composition-root/test-support/request-args";

import { CoachClientAvatarController } from "./coach-client-avatar-controller.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const OTHER_CLIENT_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
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

describe("CoachClientAvatarController writes", () => {
  it("uploads and removes a client's avatar for the coach", async () => {
    // arrange
    const { coachClientAvatarController, useCases } = createController();

    // act
    const uploaded = await coachClientAvatarController.upload(
      accountArgs(COACH, avatarUpload()),
      CLIENT_ID,
    );
    const removed = await coachClientAvatarController.remove(
      accountArgs(COACH, { method: "DELETE" }),
      CLIENT_ID,
    );

    // assert
    expect([await uploaded.json(), await removed.json()]).toEqual([
      { status: "uploaded" },
      { status: "removed" },
    ]);
    expect(useCases.uploadClientAvatarAsCoach).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: CLIENT_ID }),
    );
    expect(useCases.removeClientAvatarAsCoach).toHaveBeenCalledWith(CLIENT_ID);
  });

  it("refuses a client on the coach's routes", async () => {
    // arrange
    const { coachClientAvatarController } = createController();

    // act
    const thrown = await captureThrown(() =>
      coachClientAvatarController.remove(
        accountArgs(CLIENT, { method: "DELETE" }),
        CLIENT_ID,
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
  });
});

describe("CoachClientAvatarController urlsFor", () => {
  it("hands the coach an avatar address for each client that has one", async () => {
    // arrange
    const { coachClientAvatarController } = createController();

    // act
    const urls = await coachClientAvatarController.urlsFor(accountArgs(COACH), [
      CLIENT_ID,
      OTHER_CLIENT_ID,
    ]);

    // assert
    expect(urls).toEqual({
      [CLIENT_ID]: `/api/client-profile/avatar/${CLIENT_ID}?v=avatar-1`,
      [OTHER_CLIENT_ID]: null,
    });
  });
});

function createController() {
  const useCases = {
    listClientAvatars: vi.fn().mockResolvedValue([AVATAR_SNAPSHOT]),
    removeClientAvatarAsCoach: vi.fn().mockResolvedValue({ status: "removed" }),
    uploadClientAvatarAsCoach: vi
      .fn()
      .mockResolvedValue({ status: "uploaded" }),
  };
  const coachClientAvatarController = new CoachClientAvatarController({
    listClientAvatarsUseCase: {
      execute: useCases.listClientAvatars,
    } as unknown as ListClientAvatarsUseCase,
    removeClientAvatarAsCoachUseCase: {
      execute: useCases.removeClientAvatarAsCoach,
    } as unknown as RemoveClientAvatarAsCoachUseCase,
    uploadClientAvatarAsCoachUseCase: {
      execute: useCases.uploadClientAvatarAsCoach,
    } as unknown as UploadClientAvatarAsCoachUseCase,
  });

  return { coachClientAvatarController, useCases };
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
