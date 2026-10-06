import { describe, expect, it, vi } from "vitest";

import { ClientResource } from "./client-resource";
import {
  ClientResourceAccess,
  type ResourceRequester,
} from "./client-resource-access";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResources } from "./client-resources";
import type { ResourceClients } from "./resource-clients";

function resourceOf(id: string, clientId: string): ClientResource {
  return ClientResource.reconstitute({
    id,
    clientId,
    title: "Meal plan",
    description: "",
    file: {
      originalName: "plan.pdf",
      format: "pdf",
      sizeBytes: 10,
      pageCount: 2,
    },
    addedAt: new Date("2026-10-05T09:00:00.000Z"),
    openedAt: null,
  });
}

const RESOURCE = resourceOf("resource-1", "client-ana");
const CLOSED_PORTAL_RESOURCE = resourceOf("resource-cleo", "client-cleo");

class InMemoryClientResources implements ClientResources {
  constructor(private readonly stored: readonly ClientResource[]) {}

  async add(): Promise<void> {}

  async recordOpened(): Promise<void> {}

  async countUnopenedForClient(): Promise<number> {
    return 0;
  }

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

type ResourceClient = { clientId: string; portal: "open" | "closed" };

class InMemoryResourceClients implements ResourceClients {
  private readonly clientBySubject = new Map<string, ResourceClient>([
    ["user_ana", { clientId: "client-ana", portal: "open" }],
    ["user_bea", { clientId: "client-bea", portal: "open" }],
    ["user_cleo", { clientId: "client-cleo", portal: "closed" }],
  ]);

  async exists(clientId: string): Promise<boolean> {
    return [...this.clientBySubject.values()].some(
      (client) => client.clientId === clientId,
    );
  }

  async findByAuthSubjectId(
    authSubjectId: string,
  ): Promise<ResourceClient | null> {
    return this.clientBySubject.get(authSubjectId) ?? null;
  }
}

function createAccess() {
  const resources = new InMemoryClientResources([
    RESOURCE,
    CLOSED_PORTAL_RESOURCE,
  ]);
  const clients = new InMemoryResourceClients();
  const incidents = {
    resourceStored: vi.fn(),
    resourceRefused: vi.fn(),
    resourceAccessRefused: vi.fn(),
    resourceStorageFailed: vi.fn(),
    resourceListingFailed: vi.fn(),
    resourceOpeningFailed: vi.fn(),
    unopenedCountFailed: vi.fn(),
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
const CLEO_WITH_CLOSED_PORTAL = {
  role: "CLIENT",
  authSubjectId: "user_cleo",
} as const;
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

    it("hides her own resource from a client whose portal is closed and reports the refusal", async () => {
      // arrange
      const { access, incidents } = createAccess();

      // act
      const resource = await access.resourceFor(
        CLEO_WITH_CLOSED_PORTAL,
        "resource-cleo",
      );

      // assert
      expect(resource).toBeNull();
      expect(incidents.resourceAccessRefused).toHaveBeenCalledWith({
        requesterRole: "CLIENT",
        clientId: "client-cleo",
        resourceId: "resource-cleo",
      });
    });

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

    it("keeps a client whose portal is closed out of her own resources and reports the refusal", async () => {
      // arrange
      const { access, incidents } = createAccess();

      // act
      const reached = await access.reachesClient(
        CLEO_WITH_CLOSED_PORTAL,
        "client-cleo",
      );

      // assert
      expect(reached).toBe(false);
      expect(incidents.resourceAccessRefused).toHaveBeenCalledWith({
        requesterRole: "CLIENT",
        clientId: "client-cleo",
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

  describe("finding the client with an open portal", () => {
    it("answers her own client to a client whose portal is open", async () => {
      // arrange
      const { access } = createAccess();

      // act
      const clientId = await access.clientWithOpenPortalOf(ANA);

      // assert
      expect(clientId).toBe("client-ana");
    });

    it("answers no client to the coach, without looking one up", async () => {
      // arrange
      const { access, clients } = createAccess();
      const findClient = vi.spyOn(clients, "findByAuthSubjectId");

      // act
      const clientId = await access.clientWithOpenPortalOf(COACH);

      // assert
      expect(clientId).toBeNull();
      expect(findClient).not.toHaveBeenCalled();
    });

    it.each([
      ["a client whose portal is closed", CLEO_WITH_CLOSED_PORTAL],
      ["an account bound to no client", UNBOUND_CLIENT],
    ])(
      "answers no client to %s, without reporting it",
      async (_case, requester) => {
        // arrange
        const { access, incidents } = createAccess();

        // act
        const clientId = await access.clientWithOpenPortalOf(requester);

        // assert
        expect(clientId).toBeNull();
        expect(incidents.resourceAccessRefused).not.toHaveBeenCalled();
      },
    );
  });

  describe("reaching one of the client's own resources", () => {
    it("hands a client her own resource", async () => {
      // arrange
      const { access } = createAccess();

      // act
      const resource = await access.ownResourceFor(ANA, "resource-1");

      // assert
      expect(resource).toBe(RESOURCE);
    });

    it("hands the coach nothing, without looking the resource up", async () => {
      // arrange
      const { access, resources } = createAccess();
      const findResource = vi.spyOn(resources, "findById");

      // act
      const resource = await access.ownResourceFor(COACH, "resource-1");

      // assert
      expect(resource).toBeNull();
      expect(findResource).not.toHaveBeenCalled();
    });

    it.each([
      ["another client", BEA, "resource-1", "client-ana"],
      [
        "a client whose portal is closed",
        CLEO_WITH_CLOSED_PORTAL,
        "resource-cleo",
        "client-cleo",
      ],
    ])(
      "hands %s nothing and reports the refusal",
      async (_case, requester, resourceId, clientId) => {
        // arrange
        const { access, incidents } = createAccess();

        // act
        const resource = await access.ownResourceFor(requester, resourceId);

        // assert
        expect(resource).toBeNull();
        expect(incidents.resourceAccessRefused).toHaveBeenCalledWith({
          requesterRole: "CLIENT",
          clientId,
          resourceId,
        });
      },
    );
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

    it("has no own client and is refused its own resource before anything is looked up", async () => {
      // arrange
      const { access, resources, clients } = createAccess();
      const findResource = vi.spyOn(resources, "findById");
      const findClient = vi.spyOn(clients, "findByAuthSubjectId");

      // act
      const clientId = await access.clientWithOpenPortalOf(
        ACCOUNT_WITHOUT_RESOURCE_ROLE,
      );
      const resource = await access.ownResourceFor(
        ACCOUNT_WITHOUT_RESOURCE_ROLE,
        "resource-1",
      );

      // assert
      expect(clientId).toBeNull();
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
