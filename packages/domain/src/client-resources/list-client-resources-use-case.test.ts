import { describe, expect, it, vi } from "vitest";

import { ClientResource } from "./client-resource";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResources } from "./client-resources";
import { ListClientResourcesUseCase } from "./list-client-resources-use-case";
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
  });
}

const NEWER = resource("resource-newer", "client-ana");
const OLDER = resource("resource-older", "client-ana");

class InMemoryClientResources implements ClientResources {
  async add(): Promise<void> {}

  async listForClient(clientId: string): Promise<ClientResource[]> {
    return [NEWER, OLDER, resource("resource-bea", "client-bea")].filter(
      (stored) => stored.isFor(clientId),
    );
  }

  async findById(): Promise<ClientResource | null> {
    return null;
  }
}

function createUseCase() {
  const clients = {
    exists: vi.fn(async (clientId: string) =>
      ["client-ana", "client-bea"].includes(clientId),
    ),
    findByAuthSubjectId: vi.fn(async (authSubjectId: string) =>
      authSubjectId === "user_ana" ? { clientId: "client-ana" } : null,
    ),
  } satisfies ResourceClients;
  const incidents = {
    resourceStored: vi.fn(),
    resourceRefused: vi.fn(),
    resourceAccessRefused: vi.fn(),
    resourceStorageFailed: vi.fn(),
  } satisfies ClientResourceIncidents;
  const useCase = new ListClientResourcesUseCase({
    resources: new InMemoryClientResources(),
    clients,
    incidents,
  });

  return { useCase, incidents };
}

describe("ListClientResourcesUseCase", () => {
  it.each([
    ["the coach", { role: "COACH", authSubjectId: "user_eli" }],
    ["the client herself", { role: "CLIENT", authSubjectId: "user_ana" }],
  ] as const)(
    "lists a client's resources, newest first, for %s",
    async (_case, requester) => {
      // arrange
      const { useCase } = createUseCase();

      // act
      const result = await useCase.execute({
        requester,
        clientId: "client-ana",
      });

      // assert
      expect(result).toEqual({ status: "listed", resources: [NEWER, OLDER] });
    },
  );

  it("finds nothing for another client and reports the refusal", async () => {
    // arrange
    const { useCase, incidents } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: { role: "CLIENT", authSubjectId: "user_ana" },
      clientId: "client-bea",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(incidents.resourceAccessRefused).toHaveBeenCalledWith({
      requesterRole: "CLIENT",
      clientId: "client-bea",
      resourceId: null,
    });
  });

  it("finds nothing for a client who does not exist", async () => {
    // arrange
    const { useCase, incidents } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: { role: "COACH", authSubjectId: "user_eli" },
      clientId: "client-404",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(incidents.resourceAccessRefused).not.toHaveBeenCalled();
  });
});
