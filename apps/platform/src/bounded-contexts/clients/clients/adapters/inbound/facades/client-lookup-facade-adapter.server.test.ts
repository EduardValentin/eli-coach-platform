import { describe, expect, it } from "vitest";

import type {
  ClientIdentity,
  ClientReachPort,
} from "~/bounded-contexts/clients/clients/domain/client";
import type { ReadClientJourneyUseCase } from "~/bounded-contexts/clients/clients/domain/client-journey";

import { ClientLookupFacadeAdapter } from "./client-lookup-facade-adapter.server";

const IDENTITY: ClientIdentity = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: "+40700000000",
};

function clientLookupFacadeAdapterOver(identity: ClientIdentity | null) {
  const clientReachPort: ClientReachPort = {
    findById: async () => null,
    findByAuthSubjectId: async () => null,
  };

  return new ClientLookupFacadeAdapter({
    clientIdentitiesPort: {
      findByClientId: async (clientId) =>
        identity?.clientId === clientId ? identity : null,
    },
    clientReachPort,
    readClientJourneyUseCase: {
      execute: async () => null,
    } as unknown as ReadClientJourneyUseCase,
  });
}

describe("ClientLookupFacadeAdapter.identityOf", () => {
  it.each(["female", "male", "prefer_not_to_say"] as const)(
    "answers who she is with her name, email and %s gender, and nothing else of her identity",
    async (gender) => {
      // arrange
      const clientLookupFacadeAdapter = clientLookupFacadeAdapterOver({
        ...IDENTITY,
        gender,
      });

      // act
      const identity = await clientLookupFacadeAdapter.identityOf("client-1");

      // assert
      expect(identity).toEqual({
        clientId: "client-1",
        firstName: "Ana",
        lastName: "Popescu",
        email: "ana@example.com",
        gender,
      });
    },
  );

  it("answers nothing for a client who does not exist", async () => {
    // arrange
    const clientLookupFacadeAdapter = clientLookupFacadeAdapterOver(IDENTITY);

    // act
    const identity = await clientLookupFacadeAdapter.identityOf("client-9");

    // assert
    expect(identity).toBeNull();
  });
});
