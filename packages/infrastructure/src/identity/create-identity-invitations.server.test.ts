import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";

import type { IdentityConfig } from "@eli-coach-platform/config";
import { describe, expect, it } from "vitest";

import { ClerkIdentityInvitations } from "./clerk-identity-invitations.server";
import { createIdentityInvitations } from "./create-identity-invitations.server";
import { InMemoryIdentityInvitations } from "./in-memory-identity-invitations.server";

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
    IDENTITY_PROVIDER: "clerk",
    ...overrides,
  };
}

describe("createIdentityInvitations", () => {
  it("returns the in-memory double for the memory provider", () => {
    // arrange
    const config = createConfig({ IDENTITY_PROVIDER: "memory" });

    // act
    const identity = createIdentityInvitations(config, URLS);

    // assert
    expect(identity).toBeInstanceOf(InMemoryIdentityInvitations);
  });

  it("returns the Clerk adapter for the clerk provider", () => {
    // arrange
    const config = createConfig({ IDENTITY_PROVIDER: "clerk" });

    // act
    const identity = createIdentityInvitations(config, URLS);

    // assert
    expect(identity).toBeInstanceOf(ClerkIdentityInvitations);
  });

  it("sends Backend API calls to the configured Clerk API URL with the secret key", async () => {
    // arrange
    const clerkApi = await startClerkApiStub();
    const identity = createIdentityInvitations(
      createConfig({ CLERK_API_URL: clerkApi.baseUrl }),
      URLS,
    );

    // act
    const invitation = await identity
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
