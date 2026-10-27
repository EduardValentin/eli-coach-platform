import { describe, expect, it, vi } from "vitest";

import type {
  ClientReach,
  ClientReachReading,
} from "~/bounded-contexts/clients/clients/domain/client";

import { ClientAvatar } from "./client-avatar";
import type { ClientAvatarIds } from "./client-avatar-ids";
import type { ClientAvatarIncidents } from "./client-avatar-incidents";
import type {
  ClientAvatarRendition,
  ClientAvatarRenditions,
} from "./client-avatar-renditions";
import type {
  ClientAvatarOwner,
  ClientAvatarReference,
  ClientAvatarStore,
} from "./client-avatar-store";
import type { ClientAvatars } from "./client-avatars";
import { ListClientAvatarsUseCase } from "./list-client-avatars-use-case";
import { OpenClientAvatarUseCase } from "./open-client-avatar-use-case";
import { ReadOwnClientAvatarUseCase } from "./read-own-client-avatar-use-case";
import { RemoveClientAvatarAsCoachUseCase } from "./remove-client-avatar-as-coach-use-case";
import { RemoveOwnClientAvatarUseCase } from "./remove-own-client-avatar-use-case";
import { UploadClientAvatarAsCoachUseCase } from "./upload-client-avatar-as-coach-use-case";
import { UploadOwnClientAvatarUseCase } from "./upload-own-client-avatar-use-case";

const UPLOADED_AT = new Date("2026-10-24T10:00:00.000Z");
const RENDERED = new Uint8Array([4, 4, 4, 4]);
const JPEG = {
  mimeType: "image/jpeg",
  sizeBytes: 2_048,
  bytes: new Uint8Array([1, 2, 3]),
};

function reachOf(
  portal: ClientReachReading["portal"],
  clientId = "client-1",
): ClientReachReading {
  return {
    clientId,
    portal,
    coachingEndsAt: null,
    programStartsAt: null,
    paidThrough: null,
    timeZone: "Europe/Bucharest",
  };
}

function storedAvatar(avatarId: string, clientId = "client-1"): ClientAvatar {
  return ClientAvatar.reconstitute({
    clientId,
    avatarId,
    reference: {
      storageKey: `${clientId}/avatar/${avatarId}.bin`,
      keyId: "k1",
    },
    mimeType: "image/jpeg",
    sizeBytes: 4,
    updatedAt: new Date("2026-10-01T08:00:00.000Z"),
  });
}

class InMemoryClientAvatarStore implements ClientAvatarStore {
  readonly files = new Map<string, Uint8Array>();
  failDeletes = false;

  async store(
    owner: ClientAvatarOwner,
    bytes: Uint8Array,
  ): Promise<ClientAvatarReference> {
    const storageKey = `${owner.clientId}/avatar/${owner.avatarId}.bin`;
    this.files.set(storageKey, bytes);

    return { storageKey, keyId: "k1" };
  }

  async open(reference: ClientAvatarReference): Promise<Uint8Array | null> {
    return this.files.get(reference.storageKey) ?? null;
  }

  async delete(reference: ClientAvatarReference): Promise<void> {
    if (this.failDeletes) {
      throw new Error("The disk refused the delete.");
    }

    this.files.delete(reference.storageKey);
  }
}

class InMemoryClientAvatars implements ClientAvatars {
  readonly rows = new Map<string, ClientAvatar>();

  async findByClientId(clientId: string): Promise<ClientAvatar | null> {
    return this.rows.get(clientId) ?? null;
  }

  async findByClientIds(clientIds: readonly string[]): Promise<ClientAvatar[]> {
    return clientIds.flatMap((clientId) => this.rows.get(clientId) ?? []);
  }

  async save(avatar: ClientAvatar): Promise<void> {
    this.rows.set(avatar.toSnapshot().clientId, avatar);
  }

  async remove(clientId: string): Promise<void> {
    this.rows.delete(clientId);
  }
}

function createPorts(
  options: {
    reach?: ClientReachReading | null;
    rendition?: ClientAvatarRendition;
  } = {},
) {
  const reach =
    options.reach === undefined ? reachOf("reachable") : options.reach;

  return {
    clients: {
      findById: vi.fn().mockResolvedValue(reach),
      findByAuthSubjectId: vi.fn().mockResolvedValue(reach),
    } satisfies ClientReach,
    avatars: new InMemoryClientAvatars(),
    avatarIds: { generate: () => "avatar-2" } satisfies ClientAvatarIds,
    store: new InMemoryClientAvatarStore(),
    renditions: {
      render: vi.fn().mockResolvedValue(
        options.rendition ?? {
          status: "rendered",
          bytes: RENDERED,
          mimeType: "image/jpeg",
        },
      ),
    } satisfies ClientAvatarRenditions,
    incidents: {
      clientAvatarFileOrphaned: vi.fn(),
    } satisfies ClientAvatarIncidents,
    clock: { now: () => UPLOADED_AT },
  };
}

async function withStoredAvatar(ports: ReturnType<typeof createPorts>) {
  const avatar = storedAvatar("avatar-1");
  const { reference } = avatar.toSnapshot();
  await ports.avatars.save(avatar);
  ports.store.files.set(reference.storageKey, new Uint8Array([8]));

  return reference;
}

describe("UploadClientAvatarAsCoachUseCase", () => {
  it("renders her photo, seals it under a fresh avatar id and records it as her avatar", async () => {
    // arrange
    const ports = createPorts();
    const useCase = new UploadClientAvatarAsCoachUseCase(ports);

    // act
    const result = await useCase.execute({
      clientId: "client-1",
      avatar: JPEG,
    });

    // assert
    expect(result).toEqual({ status: "uploaded" });
    expect(ports.clients.findById).toHaveBeenCalledWith("client-1");
    expect(ports.renditions.render).toHaveBeenCalledWith(JPEG.bytes);
    expect(ports.store.files.get("client-1/avatar/avatar-2.bin")).toBe(
      RENDERED,
    );
    expect(
      (await ports.avatars.findByClientId("client-1"))?.toSnapshot(),
    ).toEqual({
      clientId: "client-1",
      avatarId: "avatar-2",
      reference: { storageKey: "client-1/avatar/avatar-2.bin", keyId: "k1" },
      mimeType: "image/jpeg",
      sizeBytes: RENDERED.byteLength,
      updatedAt: UPLOADED_AT,
    });
  });

  it("replaces her previous avatar and deletes its file", async () => {
    // arrange
    const ports = createPorts();
    const previous = await withStoredAvatar(ports);
    const useCase = new UploadClientAvatarAsCoachUseCase(ports);

    // act
    const result = await useCase.execute({
      clientId: "client-1",
      avatar: JPEG,
    });

    // assert
    expect(result).toEqual({ status: "uploaded" });
    expect(ports.store.files.has(previous.storageKey)).toBe(false);
    expect(
      (await ports.avatars.findByClientId("client-1"))?.toSnapshot().avatarId,
    ).toBe("avatar-2");
  });

  it("still answers uploaded and reports the orphaned file when the previous one cannot be deleted", async () => {
    // arrange
    const ports = createPorts();
    const previous = await withStoredAvatar(ports);
    ports.store.failDeletes = true;
    const useCase = new UploadClientAvatarAsCoachUseCase(ports);

    // act
    const result = await useCase.execute({
      clientId: "client-1",
      avatar: JPEG,
    });

    // assert
    expect(result).toEqual({ status: "uploaded" });
    expect(ports.incidents.clientAvatarFileOrphaned).toHaveBeenCalledWith({
      clientId: "client-1",
      storageKey: previous.storageKey,
    });
  });

  it.each([
    ["a GIF", { ...JPEG, mimeType: "image/gif" }],
    ["a photo over 10 MB", { ...JPEG, sizeBytes: 10 * 1024 * 1024 + 1 }],
  ])("refuses %s before rendering it", async (_label, avatar) => {
    // arrange
    const ports = createPorts();
    const useCase = new UploadClientAvatarAsCoachUseCase(ports);

    // act
    const result = await useCase.execute({ clientId: "client-1", avatar });

    // assert
    expect(result).toEqual({ status: "refused", reason: "not-accepted" });
    expect(ports.renditions.render).not.toHaveBeenCalled();
    expect(ports.avatars.rows.size).toBe(0);
  });

  it("refuses a photo the renderer cannot read and keeps her previous avatar", async () => {
    // arrange
    const ports = createPorts({ rendition: { status: "refused" } });
    const previous = await withStoredAvatar(ports);
    const useCase = new UploadClientAvatarAsCoachUseCase(ports);

    // act
    const result = await useCase.execute({
      clientId: "client-1",
      avatar: JPEG,
    });

    // assert
    expect(result).toEqual({ status: "refused", reason: "rendition-refused" });
    expect(ports.store.files.has(previous.storageKey)).toBe(true);
    expect(
      (await ports.avatars.findByClientId("client-1"))?.toSnapshot().avatarId,
    ).toBe("avatar-1");
  });

  it("refuses a photo when rendering it throws", async () => {
    // arrange
    const ports = createPorts();
    ports.renditions.render.mockRejectedValue(new Error("decoder crashed"));
    const useCase = new UploadClientAvatarAsCoachUseCase(ports);

    // act
    const result = await useCase.execute({
      clientId: "client-1",
      avatar: JPEG,
    });

    // assert
    expect(result).toEqual({ status: "refused", reason: "rendition-refused" });
  });

  it("answers not-found for someone who is not a client", async () => {
    // arrange
    const ports = createPorts({ reach: null });
    const useCase = new UploadClientAvatarAsCoachUseCase(ports);

    // act
    const result = await useCase.execute({
      clientId: "client-9",
      avatar: JPEG,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(ports.renditions.render).not.toHaveBeenCalled();
  });
});

describe("UploadOwnClientAvatarUseCase", () => {
  it("records the avatar on the client the signed-in subject is", async () => {
    // arrange
    const ports = createPorts();
    const useCase = new UploadOwnClientAvatarUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      avatar: JPEG,
    });

    // assert
    expect(result).toEqual({ status: "uploaded" });
    expect(ports.clients.findByAuthSubjectId).toHaveBeenCalledWith("user_ana");
    expect(ports.avatars.rows.has("client-1")).toBe(true);
  });

  it.each([
    ["no client", null, "not-on-journey"],
    ["a client whose portal has ended", reachOf("ended"), "ended"],
  ] as const)("refuses %s", async (_label, reach, status) => {
    // arrange
    const ports = createPorts({ reach });
    const useCase = new UploadOwnClientAvatarUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      avatar: JPEG,
    });

    // assert
    expect(result).toEqual({ status });
    expect(ports.avatars.rows.size).toBe(0);
  });
});

describe("RemoveClientAvatarAsCoachUseCase", () => {
  it("removes her avatar and then its file", async () => {
    // arrange
    const ports = createPorts();
    const reference = await withStoredAvatar(ports);
    const useCase = new RemoveClientAvatarAsCoachUseCase(ports);

    // act
    const result = await useCase.execute("client-1");

    // assert
    expect(result).toEqual({ status: "removed" });
    expect(ports.avatars.rows.size).toBe(0);
    expect(ports.store.files.has(reference.storageKey)).toBe(false);
  });

  it("answers removed when she has no avatar", async () => {
    // arrange
    const ports = createPorts();
    const useCase = new RemoveClientAvatarAsCoachUseCase(ports);

    // act
    const result = await useCase.execute("client-1");

    // assert
    expect(result).toEqual({ status: "removed" });
  });

  it("still answers removed and reports the orphaned file when it cannot be deleted", async () => {
    // arrange
    const ports = createPorts();
    const reference = await withStoredAvatar(ports);
    ports.store.failDeletes = true;
    const useCase = new RemoveClientAvatarAsCoachUseCase(ports);

    // act
    const result = await useCase.execute("client-1");

    // assert
    expect(result).toEqual({ status: "removed" });
    expect(ports.avatars.rows.size).toBe(0);
    expect(ports.incidents.clientAvatarFileOrphaned).toHaveBeenCalledWith({
      clientId: "client-1",
      storageKey: reference.storageKey,
    });
  });

  it("answers not-found for someone who is not a client", async () => {
    // arrange
    const ports = createPorts({ reach: null });
    const useCase = new RemoveClientAvatarAsCoachUseCase(ports);

    // act
    const result = await useCase.execute("client-9");

    // assert
    expect(result).toEqual({ status: "not-found" });
  });
});

describe("RemoveOwnClientAvatarUseCase", () => {
  it("removes the avatar of the client the signed-in subject is", async () => {
    // arrange
    const ports = createPorts();
    await withStoredAvatar(ports);
    const useCase = new RemoveOwnClientAvatarUseCase(ports);

    // act
    const result = await useCase.execute("user_ana");

    // assert
    expect(result).toEqual({ status: "removed" });
    expect(ports.avatars.rows.size).toBe(0);
  });

  it.each([
    ["no client", null, "not-on-journey"],
    ["a client whose portal has ended", reachOf("ended"), "ended"],
  ] as const)(
    "refuses %s and keeps the avatar",
    async (_label, reach, status) => {
      // arrange
      const ports = createPorts({ reach });
      await withStoredAvatar(ports);
      const useCase = new RemoveOwnClientAvatarUseCase(ports);

      // act
      const result = await useCase.execute("user_ana");

      // assert
      expect(result).toEqual({ status });
      expect(ports.avatars.rows.size).toBe(1);
    },
  );
});

describe("OpenClientAvatarUseCase", () => {
  it("opens any client's avatar for the coach", async () => {
    // arrange
    const ports = createPorts();
    await withStoredAvatar(ports);
    const useCase = new OpenClientAvatarUseCase(ports);

    // act
    const result = await useCase.execute({
      clientId: "client-1",
      requester: { role: "COACH", authSubjectId: "user_coach" },
    });

    // assert
    expect(result).toEqual({
      status: "opened",
      bytes: new Uint8Array([8]),
      mimeType: "image/jpeg",
    });
    expect(ports.clients.findByAuthSubjectId).not.toHaveBeenCalled();
  });

  it("opens her own avatar for the client", async () => {
    // arrange
    const ports = createPorts();
    await withStoredAvatar(ports);
    const useCase = new OpenClientAvatarUseCase(ports);

    // act
    const result = await useCase.execute({
      clientId: "client-1",
      requester: { role: "CLIENT", authSubjectId: "user_ana" },
    });

    // assert
    expect(result.status).toBe("opened");
  });

  it("answers not-found to a client asking for another client's avatar", async () => {
    // arrange
    const ports = createPorts({ reach: reachOf("reachable", "client-2") });
    await withStoredAvatar(ports);
    const useCase = new OpenClientAvatarUseCase(ports);

    // act
    const result = await useCase.execute({
      clientId: "client-1",
      requester: { role: "CLIENT", authSubjectId: "user_eve" },
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
  });

  it("answers not-found when she has no avatar or its file is gone", async () => {
    // arrange
    const ports = createPorts();
    await ports.avatars.save(storedAvatar("avatar-1"));
    const useCase = new OpenClientAvatarUseCase(ports);

    // act
    const missingFile = await useCase.execute({
      clientId: "client-1",
      requester: { role: "COACH", authSubjectId: "user_coach" },
    });
    const missingAvatar = await useCase.execute({
      clientId: "client-2",
      requester: { role: "COACH", authSubjectId: "user_coach" },
    });

    // assert
    expect(missingFile).toEqual({ status: "not-found" });
    expect(missingAvatar).toEqual({ status: "not-found" });
  });
});

describe("ListClientAvatarsUseCase", () => {
  it("lists the avatars the given clients have", async () => {
    // arrange
    const ports = createPorts();
    await ports.avatars.save(storedAvatar("avatar-1", "client-1"));
    await ports.avatars.save(storedAvatar("avatar-3", "client-3"));
    const useCase = new ListClientAvatarsUseCase(ports);

    // act
    const avatars = await useCase.execute(["client-1", "client-2"]);

    // assert
    expect(avatars.map((avatar) => avatar.clientId)).toEqual(["client-1"]);
  });
});

describe("ReadOwnClientAvatarUseCase", () => {
  it("reads the avatar of the client the signed-in subject is", async () => {
    // arrange
    const ports = createPorts();
    await withStoredAvatar(ports);
    const useCase = new ReadOwnClientAvatarUseCase(ports);

    // act
    const avatar = await useCase.execute("user_ana");

    // assert
    expect(avatar?.clientId).toBe("client-1");
  });

  it("reads nothing for a subject bound to no client or a client with no avatar", async () => {
    // arrange
    const strangerPorts = createPorts({ reach: null });
    const clientPorts = createPorts();

    // act
    const forStranger = await new ReadOwnClientAvatarUseCase(
      strangerPorts,
    ).execute("user_stranger");
    const forClient = await new ReadOwnClientAvatarUseCase(clientPorts).execute(
      "user_ana",
    );

    // assert
    expect(forStranger).toBeNull();
    expect(forClient).toBeNull();
  });
});
