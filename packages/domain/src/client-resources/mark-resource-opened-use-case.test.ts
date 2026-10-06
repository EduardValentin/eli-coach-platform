import { describe, expect, it, vi } from "vitest";

import { ClientResource } from "./client-resource";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResources } from "./client-resources";
import { MarkResourceOpenedUseCase } from "./mark-resource-opened-use-case";
import type { ResourceClients } from "./resource-clients";

const ADDED_AT = new Date("2026-10-05T09:00:00.000Z");
const FIRST_OPENED_AT = new Date("2026-10-06T09:00:00.000Z");
const NOW = new Date("2026-10-07T09:00:00.000Z");

function resource(
  id: string,
  options: { clientId: string; openedAt: Date | null },
): ClientResource {
  return ClientResource.reconstitute({
    id,
    clientId: options.clientId,
    title: id,
    description: "",
    file: {
      originalName: `${id}.docx`,
      format: "docx",
      sizeBytes: 10,
      pageCount: null,
    },
    addedAt: ADDED_AT,
    openedAt: options.openedAt,
  });
}

class InMemoryClientResources implements ClientResources {
  readonly stored = new Map<string, ClientResource>(
    [
      resource("resource-new", { clientId: "client-ana", openedAt: null }),
      resource("resource-opened", {
        clientId: "client-ana",
        openedAt: FIRST_OPENED_AT,
      }),
      resource("resource-cleo", { clientId: "client-cleo", openedAt: null }),
    ].map((stored) => [stored.toSnapshot().id, stored]),
  );

  async add(): Promise<void> {}

  async recordOpened(opened: ClientResource): Promise<void> {
    this.stored.set(opened.toSnapshot().id, opened);
  }

  async countUnopenedForClient(): Promise<number> {
    return 0;
  }

  async listForClient(): Promise<ClientResource[]> {
    return [];
  }

  async findById(resourceId: string): Promise<ClientResource | null> {
    return this.stored.get(resourceId) ?? null;
  }

  openedAtOf(resourceId: string): Date | null {
    return this.stored.get(resourceId)?.toSnapshot().openedAt ?? null;
  }
}

type ResourceClient = { clientId: string; portal: "open" | "closed" };

const CLIENT_BY_SUBJECT = new Map<string, ResourceClient>([
  ["user_ana", { clientId: "client-ana", portal: "open" }],
  ["user_bea", { clientId: "client-bea", portal: "open" }],
  ["user_cleo", { clientId: "client-cleo", portal: "closed" }],
]);

function createUseCase() {
  const resources = new InMemoryClientResources();
  const clients = {
    exists: vi.fn(async () => true),
    findByAuthSubjectId: vi.fn(
      async (authSubjectId: string) =>
        CLIENT_BY_SUBJECT.get(authSubjectId) ?? null,
    ),
  } satisfies ResourceClients;
  const incidents = {
    resourceStored: vi.fn(),
    resourceRefused: vi.fn(),
    resourceAccessRefused: vi.fn(),
    resourceStorageFailed: vi.fn(),
    resourceListingFailed: vi.fn(),
    resourceOpeningFailed: vi.fn(),
    unopenedCountFailed: vi.fn(),
  } satisfies ClientResourceIncidents;
  const useCase = new MarkResourceOpenedUseCase({
    resources,
    clients,
    incidents,
    clock: { now: () => NOW },
  });

  return { useCase, resources, incidents };
}

const ANA = { role: "CLIENT", authSubjectId: "user_ana" } as const;

describe("MarkResourceOpenedUseCase", () => {
  it("records the moment a client first opens her resource", async () => {
    // arrange
    const { useCase, resources } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: ANA,
      resourceId: "resource-new",
    });

    // assert
    expect(result).toEqual({ status: "opened" });
    expect(resources.openedAtOf("resource-new")).toEqual(NOW);
  });

  it("answers opened without writing when she opened it before", async () => {
    // arrange
    const { useCase, resources } = createUseCase();
    const recordOpened = vi.spyOn(resources, "recordOpened");

    // act
    const result = await useCase.execute({
      requester: ANA,
      resourceId: "resource-opened",
    });

    // assert
    expect(result).toEqual({ status: "opened" });
    expect(recordOpened).not.toHaveBeenCalled();
    expect(resources.openedAtOf("resource-opened")).toEqual(FIRST_OPENED_AT);
  });

  it("lets the coach mark nothing, without looking the resource up", async () => {
    // arrange
    const { useCase, resources } = createUseCase();
    const findResource = vi.spyOn(resources, "findById");

    // act
    const result = await useCase.execute({
      requester: { role: "COACH", authSubjectId: "user_eli" },
      resourceId: "resource-new",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(findResource).not.toHaveBeenCalled();
    expect(resources.openedAtOf("resource-new")).toBeNull();
  });

  it.each([
    [
      "another client",
      { role: "CLIENT", authSubjectId: "user_bea" },
      "resource-new",
    ],
    [
      "a client whose portal is closed, on her own resource",
      { role: "CLIENT", authSubjectId: "user_cleo" },
      "resource-cleo",
    ],
  ] as const)(
    "lets %s mark nothing and reports the refusal",
    async (_case, requester, resourceId) => {
      // arrange
      const { useCase, resources, incidents } = createUseCase();

      // act
      const result = await useCase.execute({ requester, resourceId });

      // assert
      expect(result).toEqual({ status: "not-found" });
      expect(resources.openedAtOf(resourceId)).toBeNull();
      expect(incidents.resourceAccessRefused).toHaveBeenCalledOnce();
    },
  );

  it("finds nothing to mark for an unknown resource", async () => {
    // arrange
    const { useCase } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: ANA,
      resourceId: "resource-404",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
  });

  it("reports a failed write and answers that the mark failed", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, resources, incidents } = createUseCase();
    vi.spyOn(resources, "recordOpened").mockRejectedValue(failure);

    // act
    const result = await useCase.execute({
      requester: ANA,
      resourceId: "resource-new",
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(incidents.resourceOpeningFailed).toHaveBeenCalledWith({
      clientId: "client-ana",
      resourceId: "resource-new",
      error: failure,
    });
  });
});
