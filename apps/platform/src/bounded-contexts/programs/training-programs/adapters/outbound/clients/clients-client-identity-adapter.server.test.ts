import { describe, expect, it } from "vitest";

import type { ClientLookupFacade } from "~/bounded-contexts/clients/public/client-lookup-facade";

import { ClientsClientIdentityAdapter } from "./clients-client-identity-adapter.server";

type IdentityFacade = Pick<ClientLookupFacade, "identityOf">;

function clientLookupFacadeOver(
  identity: Awaited<ReturnType<IdentityFacade["identityOf"]>>,
) {
  const asked: string[] = [];
  const clientLookupFacade: IdentityFacade = {
    identityOf: async (clientId) => {
      asked.push(clientId);

      return identity;
    },
  };

  return { clientLookupFacade, asked };
}

describe("ClientsClientIdentityAdapter.find", () => {
  it.each(["female", "male", "prefer_not_to_say"] as const)(
    "translates her name and %s gender, and nothing else the clients facade knows of her",
    async (gender) => {
      // arrange
      const { clientLookupFacade, asked } = clientLookupFacadeOver({
        clientId: "client-1",
        firstName: "Ana",
        lastName: "Popescu",
        email: "ana@example.com",
        gender,
      });
      const clientsClientIdentityAdapter = new ClientsClientIdentityAdapter(
        clientLookupFacade,
      );

      // act
      const clientIdentity =
        await clientsClientIdentityAdapter.find("client-1");

      // assert
      expect(clientIdentity).toEqual({
        clientId: "client-1",
        firstName: "Ana",
        lastName: "Popescu",
        gender,
      });
      expect(asked).toEqual(["client-1"]);
    },
  );

  it("answers nothing for a client the clients facade does not know", async () => {
    // arrange
    const { clientLookupFacade } = clientLookupFacadeOver(null);
    const clientsClientIdentityAdapter = new ClientsClientIdentityAdapter(
      clientLookupFacade,
    );

    // act
    const clientIdentity = await clientsClientIdentityAdapter.find("client-9");

    // assert
    expect(clientIdentity).toBeNull();
  });
});
