import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import type {
  OpenProgressPhotoUseCase,
  RemoveProgressPhotoUseCase,
} from "@eli-coach-platform/domain/client-profile";
import { describe, expect, it, vi } from "vitest";

import {
  sessionContext,
  type ResolvedSession,
} from "~/features/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { ProgressPhotoController } from "./progress-photo-controller.server";

const PHOTO_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";
const PHOTO_BYTES = new Uint8Array([255, 216, 255, 224, 0, 16]);

const CLIENT: AccountSnapshot = {
  authSubjectId: "user_ana",
  id: "acct_ana",
  role: "CLIENT",
};

const COACH_SESSION: ResolvedSession = {
  account: { authSubjectId: "user_eli", id: "acct_eli", role: "COACH" },
  kind: "authenticated",
};

const ANONYMOUS_SESSION: ResolvedSession = { kind: "anonymous" };

type OpenProgressPhotoResult = Awaited<
  ReturnType<OpenProgressPhotoUseCase["execute"]>
>;

type RemoveProgressPhotoResult = Awaited<
  ReturnType<RemoveProgressPhotoUseCase["execute"]>
>;

describe("ProgressPhotoController open", () => {
  it("answers the photo privately, never cached, sniffed or scripted", async () => {
    // arrange
    const { controller, openProgressPhoto } = createController({
      opened: { status: "opened", bytes: PHOTO_BYTES, mimeType: "image/jpeg" },
    });

    // act
    const response = await controller.open(photoArgs(), PHOTO_ID);

    // assert
    expect(response.status).toBe(200);
    expect(Object.fromEntries(response.headers)).toEqual({
      "cache-control": "private, no-store",
      "cross-origin-resource-policy": "same-origin",
      "content-length": String(PHOTO_BYTES.byteLength),
      "content-security-policy": "sandbox; default-src 'none'",
      "content-type": "image/jpeg",
      "x-content-type-options": "nosniff",
    });
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PHOTO_BYTES);
    expect(openProgressPhoto).toHaveBeenCalledWith({
      photoId: PHOTO_ID,
      requester: { role: "CLIENT", authSubjectId: "user_ana" },
    });
  });

  it("asks for the photo on behalf of the coach with her role", async () => {
    // arrange
    const { controller, openProgressPhoto } = createController({
      opened: { status: "opened", bytes: PHOTO_BYTES, mimeType: "image/jpeg" },
    });

    // act
    await controller.open(photoArgs({ session: COACH_SESSION }), PHOTO_ID);

    // assert
    expect(openProgressPhoto).toHaveBeenCalledWith({
      photoId: PHOTO_ID,
      requester: { role: "COACH", authSubjectId: "user_eli" },
    });
  });

  it("answers not found to anyone the photo is not shown to", async () => {
    // arrange
    const { controller } = createController({
      opened: { status: "not-found" },
    });

    // act
    const response = await controller.open(photoArgs(), PHOTO_ID);

    // assert
    expect(response.status).toBe(404);
  });

  it("answers not found to an id that is not a uuid without looking for a photo", async () => {
    // arrange
    const { controller, openProgressPhoto } = createController();

    // act
    const response = await controller.open(photoArgs(), "../../etc/passwd");

    // assert
    expect(response.status).toBe(404);
    expect(openProgressPhoto).not.toHaveBeenCalled();
  });

  it("refuses a visitor who is not signed in without looking for a photo", async () => {
    // arrange
    const { controller, openProgressPhoto } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.open(photoArgs({ session: ANONYMOUS_SESSION }), PHOTO_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(401);
    expect(openProgressPhoto).not.toHaveBeenCalled();
  });
});

describe("ProgressPhotoController remove", () => {
  it("removes her photo and answers no content", async () => {
    // arrange
    const { controller, removeProgressPhoto } = createController({
      removed: { status: "removed" },
    });

    // act
    const response = await controller.remove(photoArgs(), PHOTO_ID);

    // assert
    expect(response.status).toBe(204);
    expect(removeProgressPhoto).toHaveBeenCalledWith({
      photoId: PHOTO_ID,
      requester: { role: "CLIENT", authSubjectId: "user_ana" },
    });
  });

  it("answers not found to anyone who does not own the photo, the coach included", async () => {
    // arrange
    const { controller } = createController({
      removed: { status: "not-found" },
    });

    // act
    const response = await controller.remove(
      photoArgs({ session: COACH_SESSION }),
      PHOTO_ID,
    );

    // assert
    expect(response.status).toBe(404);
  });

  it("answers not found to an id that is not a uuid without removing anything", async () => {
    // arrange
    const { controller, removeProgressPhoto } = createController();

    // act
    const response = await controller.remove(photoArgs(), undefined);

    // assert
    expect(response.status).toBe(404);
    expect(removeProgressPhoto).not.toHaveBeenCalled();
  });

  it("lets a failure to delete the stored file surface once the record is gone", async () => {
    // arrange
    const { controller } = createController({
      removeFailure: new Error("EACCES"),
    });

    // act
    const removing = controller.remove(photoArgs(), PHOTO_ID);

    // assert
    await expect(removing).rejects.toThrow("EACCES");
  });

  it("refuses a visitor who is not signed in without removing anything", async () => {
    // arrange
    const { controller, removeProgressPhoto } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.remove(photoArgs({ session: ANONYMOUS_SESSION }), PHOTO_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(401);
    expect(removeProgressPhoto).not.toHaveBeenCalled();
  });
});

function createController(
  options: {
    opened?: OpenProgressPhotoResult;
    removed?: RemoveProgressPhotoResult;
    removeFailure?: Error;
  } = {},
) {
  const openProgressPhoto = vi
    .fn()
    .mockResolvedValue(options.opened ?? { status: "not-found" });
  const removeProgressPhoto = options.removeFailure
    ? vi.fn().mockRejectedValue(options.removeFailure)
    : vi.fn().mockResolvedValue(options.removed ?? { status: "not-found" });
  const controller = new ProgressPhotoController({
    openProgressPhoto: {
      execute: openProgressPhoto,
    } as unknown as OpenProgressPhotoUseCase,
    removeProgressPhoto: {
      execute: removeProgressPhoto,
    } as unknown as RemoveProgressPhotoUseCase,
  });

  return { controller, openProgressPhoto, removeProgressPhoto };
}

function photoArgs(options: { session?: ResolvedSession } = {}) {
  return createRequestArgs({
    contexts: [
      contextEntry(
        sessionContext,
        options.session ?? { account: CLIENT, kind: "authenticated" },
      ),
    ],
    request: new Request(
      `https://evoa.fit/api/client-profile/photos/${PHOTO_ID}`,
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
