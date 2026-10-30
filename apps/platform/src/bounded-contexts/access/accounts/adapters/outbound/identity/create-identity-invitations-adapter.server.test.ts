import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";

import type { IdentityConfig } from "~/bounded-contexts/access/accounts/config.server";
import { describe, expect, it } from "vitest";

import { ClerkIdentityInvitationsAdapter } from "./clerk-identity-invitations-adapter.server";
import { createIdentityInvitationsAdapter } from "./create-identity-invitations-adapter.server";
import { InMemoryIdentityInvitationsAdapter } from "./in-memory-identity-invitations-adapter.server";

const URLS = {
  signUpUrl: "https://accounts.evoa.example/sign-up",
  returnUrl: "https://evoa.example/client",
};

type RecordedRequest = {
  method: string | undefined;
  url: string | undefined;
  headers: IncomingHttpHeaders;
  body: string;
};

async function startClerkApiStub() {
  const requests: RecordedRequest[] = [];
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    request.on("end", () => {
      requests.push({
        method: request.method,
        url: request.url,
        headers: request.headers,
        body,
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          object: "invitation",
          id: "inv_stub",
          email_address: "ana@example.com",
          public_metadata: { invitationId: "invitation-1" },
          created_at: 1790000000000,
          updated_at: 1790000000000,
          status: "pending",
          url: "https://accounts.evoa.example/sign-up?__clerk_ticket=stub",
          revoked: false,
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    requests,
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

function createConfig(overrides: Partial<IdentityConfig> = {}): IdentityConfig {
  return {
    CLERK_SECRET_KEY: "sk_test_unit",
    CLERK_SIGN_UP_URL: URLS.signUpUrl,
    IDENTITY_PROVIDER: "clerk",
    ...overrides,
  };
}

describe("createIdentityInvitations", () => {
  it("returns the in-memory double for the memory provider", () => {
    // arrange
    const config = createConfig({ IDENTITY_PROVIDER: "memory" });

    // act
    const identityInvitationsPort = createIdentityInvitationsAdapter(
      config,
      URLS,
    );

    // assert
    expect(identityInvitationsPort).toBeInstanceOf(
      InMemoryIdentityInvitationsAdapter,
    );
  });

  it("returns the Clerk adapter for the clerk provider", () => {
    // arrange
    const config = createConfig({ IDENTITY_PROVIDER: "clerk" });

    // act
    const identityInvitationsPort = createIdentityInvitationsAdapter(
      config,
      URLS,
    );

    // assert
    expect(identityInvitationsPort).toBeInstanceOf(
      ClerkIdentityInvitationsAdapter,
    );
  });

  it("sends Backend API calls to the configured Clerk API URL with the secret key", async () => {
    // arrange
    const clerkApi = await startClerkApiStub();
    const identityInvitationsPort = createIdentityInvitationsAdapter(
      createConfig({ CLERK_API_URL: clerkApi.baseUrl }),
      URLS,
    );

    // act
    const invitation = await identityInvitationsPort
      .create({ email: "ana@example.com", invitationId: "invitation-1" })
      .finally(clerkApi.stop);

    // assert
    expect(invitation).toEqual({
      id: "inv_stub",
      url: "https://accounts.evoa.example/sign-up?__clerk_ticket=stub",
    });
    expect(clerkApi.requests).toHaveLength(1);
    const [request] = clerkApi.requests;
    expect(request.method).toBe("POST");
    expect(request.url).toBe("/v1/invitations");
    expect(request.headers.authorization).toBe("Bearer sk_test_unit");
    expect(JSON.parse(request.body)).toEqual({
      email_address: "ana@example.com",
      ignore_existing: true,
      notify: false,
      expires_in_days: 30,
      public_metadata: { invitationId: "invitation-1" },
      redirect_url:
        "https://accounts.evoa.example/sign-up?redirect_url=https%3A%2F%2Fevoa.example%2Fclient",
    });
  });
});
