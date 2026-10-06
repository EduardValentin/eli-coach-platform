import { describe, expect, it, vi } from "vitest";

import { ClientResource } from "./client-resource";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResources } from "./client-resources";
import { ListOwnResourcesUseCase } from "./list-own-resources-use-case";
import type { ResourceClients } from "./resource-clients";

function resource(id: string, clientId: string): ClientResource {
  return ClientResource.reconstitute({
    id,
    clientId,
    title: id,
    description: "",
    file: {
      originalName: `${id}.pdf`,
      format: "pdf",
      sizeBytes: 10,
      pageCount: 1,
    },
    addedAt: new Date("2026-10-05T09:00:00.000Z"),
    openedAt: null,
  });
}

const NEWER = resource("resource-newer", "client-ana");
const OLDER = resource("resource-older", "client-ana");

class InMemoryClientResources implements ClientResources {
  async add(): Promise<void> {}

  async recordOpened(): Promise<void> {}

  async countUnopenedForClient(): Promise<number> {
    return 0;
  }

  async listForClient(clientId: string): Promise<ClientResource[]> {
    return [NEWER, OLDER, resource("resource-bea", "client-bea")].filter(
      (stored) => stored.isFor(clientId),
    );
  }

  async findById(): Promise<ClientResource | null> {
    return null;
  }
}

type ResourceClient = { clientId: string; portal: "open" | "closed" };

const CLIENT_BY_SUBJECT = new Map<string, ResourceClient>([
  ["user_ana", { clientId: "client-ana", portal: "open" }],
  ["user_cleo", { clientId: "client-cleo", portal: "closed" }],
]);

function createUseCase(
  resources: ClientResources = new InMemoryClientResources(),
) {
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
  const useCase = new ListOwnResourcesUseCase({
    resources,
    clients,
    incidents,
  });

  return { useCase, clients, incidents };
}

describe("ListOwnResourcesUseCase", () => {
  it("lists only her own resources, newest first, to a client whose portal is open", async () => {
    // arrange
    const { useCase } = createUseCase();

    // act
    const result = await useCase.execute({
      role: "CLIENT",
      authSubjectId: "user_ana",
    });

    // assert
    expect(result).toEqual({ status: "listed", resources: [NEWER, OLDER] });
  });

  it.each([
    ["a client whose portal is closed", "user_cleo"],
    ["an account bound to no client", "user_nobody"],
  ])("finds nothing for %s", async (_case, authSubjectId) => {
    // arrange
    const { useCase, incidents } = createUseCase();

    // act
    const result = await useCase.execute({ role: "CLIENT", authSubjectId });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(incidents.resourceAccessRefused).not.toHaveBeenCalled();
  });

  it("finds nothing for the coach, who has no resources of her own", async () => {
    // arrange
    const { useCase, clients } = createUseCase();

    // act
    const result = await useCase.execute({
      role: "COACH",
      authSubjectId: "user_eli",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(clients.findByAuthSubjectId).not.toHaveBeenCalled();
  });

  it("reports a failed read and answers that the listing is unavailable", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const unreadable = new InMemoryClientResources();
    vi.spyOn(unreadable, "listForClient").mockRejectedValue(failure);
    const { useCase, incidents } = createUseCase(unreadable);

    // act
    const result = await useCase.execute({
      role: "CLIENT",
      authSubjectId: "user_ana",
    });

    // assert
    expect(result).toEqual({ status: "unavailable" });
    expect(incidents.resourceListingFailed).toHaveBeenCalledWith({
      clientId: "client-ana",
      error: failure,
    });
  });
});
