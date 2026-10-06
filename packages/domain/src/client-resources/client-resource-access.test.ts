import { describe, expect, it, vi } from "vitest";

import { ClientResource } from "./client-resource";
import {
  ClientResourceAccess,
  type ResourceRequester,
} from "./client-resource-access";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResources } from "./client-resources";
import type { ResourceClients } from "./resource-clients";

const RESOURCE = ClientResource.reconstitute({
  id: "resource-1",
  clientId: "client-ana",
  title: "Meal plan",
  description: "",
  file: {
    originalName: "plan.pdf",
    format: "pdf",
    sizeBytes: 10,
    pageCount: 2,
  },
  addedAt: new Date("2026-10-05T09:00:00.000Z"),
});

class InMemoryClientResources implements ClientResources {
  constructor(private readonly stored: readonly ClientResource[]) {}

  async add(): Promise<void> {}

  async listForClient(clientId: string): Promise<ClientResource[]> {
    return this.stored.filter((resource) => resource.isFor(clientId));
  }

  async findById(resourceId: string): Promise<ClientResource | null> {
    return (
      this.stored.find((resource) => resource.toSnapshot().id === resourceId) ??
      null
    );
  }
}

class InMemoryResourceClients implements ResourceClients {
  private readonly clientIdBySubject = new Map([
    ["user_ana", "client-ana"],
    ["user_bea", "client-bea"],
  ]);

  async exists(clientId: string): Promise<boolean> {
    return [...this.clientIdBySubject.values()].includes(clientId);
  }

  async findByAuthSubjectId(
    authSubjectId: string,
  ): Promise<{ clientId: string } | null> {
    const clientId = this.clientIdBySubject.get(authSubjectId);

    return clientId ? { clientId } : null;
  }
}

function createAccess() {
  const resources = new InMemoryClientResources([RESOURCE]);
  const clients = new InMemoryResourceClients();
  const incidents = {
    resourceStored: vi.fn(),
    resourceRefused: vi.fn(),
    resourceAccessRefused: vi.fn(),
    resourceStorageFailed: vi.fn(),
  } satisfies ClientResourceIncidents;
  const access = new ClientResourceAccess({ resources, clients, incidents });

  return { access, incidents, resources, clients };
}

const COACH = { role: "COACH", authSubjectId: "user_eli" } as const;
const ANA = { role: "CLIENT", authSubjectId: "user_ana" } as const;
const BEA = { role: "CLIENT", authSubjectId: "user_bea" } as const;
const ACCOUNT_WITHOUT_RESOURCE_ROLE = {
  role: "USER",
  authSubjectId: "user_ana",
} as unknown as ResourceRequester;
const UNBOUND_CLIENT = {
  role: "CLIENT",
  authSubjectId: "user_nobody",
} as const;

describe("ClientResourceAccess", () => {
  describe("reaching one resource", () => {
    it.each([
      ["the coach", COACH],
      ["the client it is for", ANA],
    ])("hands the resource to %s", async (_case, requester) => {
      // arrange
      const { access, incidents } = createAccess();

      // act
      const resource = await access.resourceFor(requester, "resource-1");

      // assert
      expect(resource).toBe(RESOURCE);
      expect(incidents.resourceAccessRefused).not.toHaveBeenCalled();
    });

    it.each([
      ["another client", BEA],
      ["an account bound to no client", UNBOUND_CLIENT],
    ])(
      "hides the resource from %s and reports the refusal",
      async (_case, requester) => {
        // arrange
        const { access, incidents } = createAccess();

        // act
        const resource = await access.resourceFor(requester, "resource-1");

        // assert
        expect(resource).toBeNull();
        expect(incidents.resourceAccessRefused).toHaveBeenCalledWith({
          requesterRole: "CLIENT",
          clientId: "client-ana",
          resourceId: "resource-1",
        });
      },
    );

    it.each([
      ["the coach", COACH],
      ["a client", ANA],
    ])(
      "finds nothing for %s asking for an unknown id, without reporting it",
      async (_case, requester) => {
        // arrange
        const { access, incidents } = createAccess();

        // act
        const resource = await access.resourceFor(requester, "resource-404");

        // assert
        expect(resource).toBeNull();
        expect(incidents.resourceAccessRefused).not.toHaveBeenCalled();
      },
    );
  });

  describe("reaching a client's resources", () => {
    it.each([
      ["the coach", COACH],
      ["the client herself", ANA],
    ])("lets %s in", async (_case, requester) => {
      // arrange
      const { access } = createAccess();

      // act
      const reached = await access.reachesClient(requester, "client-ana");

      // assert
      expect(reached).toBe(true);
    });

    it("keeps another client out and reports the refusal", async () => {
      // arrange
      const { access, incidents } = createAccess();

      // act
      const reached = await access.reachesClient(BEA, "client-ana");

      // assert
      expect(reached).toBe(false);
      expect(incidents.resourceAccessRefused).toHaveBeenCalledWith({
        requesterRole: "CLIENT",
        clientId: "client-ana",
        resourceId: null,
      });
    });

    it("finds no unknown client, even for the coach, without reporting it", async () => {
      // arrange
      const { access, incidents } = createAccess();

      // act
      const reached = await access.reachesClient(COACH, "client-404");

      // assert
      expect(reached).toBe(false);
      expect(incidents.resourceAccessRefused).not.toHaveBeenCalled();
    });
  });

  describe("an account in neither the coach nor the client role", () => {
    it("is refused one resource before anything is looked up, even when a client record is linked to it", async () => {
      // arrange
      const { access, resources, clients } = createAccess();
      const findResource = vi.spyOn(resources, "findById");
      const findClient = vi.spyOn(clients, "findByAuthSubjectId");

      // act
      const resource = await access.resourceFor(
        ACCOUNT_WITHOUT_RESOURCE_ROLE,
        "resource-1",
      );

      // assert
      expect(resource).toBeNull();
      expect(findResource).not.toHaveBeenCalled();
      expect(findClient).not.toHaveBeenCalled();
    });

    it("is refused a client's resources before anything is looked up, even her own", async () => {
      // arrange
      const { access, clients } = createAccess();
      const clientExists = vi.spyOn(clients, "exists");
      const findClient = vi.spyOn(clients, "findByAuthSubjectId");

      // act
      const reached = await access.reachesClient(
        ACCOUNT_WITHOUT_RESOURCE_ROLE,
        "client-ana",
      );

      // assert
      expect(reached).toBe(false);
      expect(clientExists).not.toHaveBeenCalled();
      expect(findClient).not.toHaveBeenCalled();
    });
  });
});
