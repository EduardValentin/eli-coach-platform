import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";

import type { IdentityConfig } from "~/bounded-contexts/access/accounts/config.server";
import { describe, expect, it } from "vitest";

import { ClerkApiKeyVerifierAdapter } from "./clerk-api-key-verifier-adapter.server";
import { createApiKeyVerifierAdapter } from "./create-api-key-verifier-adapter.server";
import { InMemoryApiKeyVerifierAdapter } from "./in-memory-api-key-verifier-adapter.server";

type RecordedRequest = {
  method: string | undefined;
  url: string | undefined;
  headers: IncomingHttpHeaders;
  body: string;
};

type StubbedAnswer = { status: number; body: unknown };

const VALID_KEY_ANSWER: StubbedAnswer = {
  status: 200,
  body: {
    object: "api_key",
    id: "ak_id_coach",
    type: "api_key",
    name: "Publishing agent",
    subject: "user_coach",
    scopes: [],
    claims: null,
    revoked: false,
    revocation_reason: null,
    expired: false,
    expiration: null,
    created_by: null,
    description: null,
    last_used_at: null,
    created_at: 1_790_000_000_000,
    updated_at: 1_790_000_000_000,
  },
};

const UNKNOWN_KEY_ANSWER: StubbedAnswer = {
  status: 404,
  body: {
    errors: [
      {
        code: "api_key_not_found",
        message: "API Key not found",
        long_message: "API Key not found",
      },
    ],
  },
};

async function startClerkApiStub(answer: StubbedAnswer) {
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
      response.writeHead(answer.status, { "content-type": "application/json" });
      response.end(JSON.stringify(answer.body));
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
    CLERK_SIGN_UP_URL: "https://accounts.evoa.example/sign-up",
    IDENTITY_PROVIDER: "clerk",
    ...overrides,
  };
}

describe("createApiKeyVerifierAdapter", () => {
  it("returns the in-memory double for the memory provider", () => {
    // arrange
    const config = createConfig({ IDENTITY_PROVIDER: "memory" });

    // act
    const apiKeyVerifierPort = createApiKeyVerifierAdapter(config);

    // assert
    expect(apiKeyVerifierPort).toBeInstanceOf(InMemoryApiKeyVerifierAdapter);
  });

  it("returns the Clerk adapter for the clerk provider", () => {
    // arrange
    const config = createConfig({ IDENTITY_PROVIDER: "clerk" });

    // act
    const apiKeyVerifierPort = createApiKeyVerifierAdapter(config);

    // assert
    expect(apiKeyVerifierPort).toBeInstanceOf(ClerkApiKeyVerifierAdapter);
  });

  it("verifies the key at the configured Clerk API URL with the secret key", async () => {
    // arrange
    const clerkApi = await startClerkApiStub(VALID_KEY_ANSWER);
    const apiKeyVerifierPort = createApiKeyVerifierAdapter(
      createConfig({ CLERK_API_URL: clerkApi.baseUrl }),
    );

    // act
    const holder = await apiKeyVerifierPort
      .verify("ak_coach")
      .finally(clerkApi.stop);

    // assert
    expect(holder).toEqual({ authSubjectId: "user_coach" });
    expect(clerkApi.requests).toHaveLength(1);
    const [request] = clerkApi.requests;
    expect(request.method).toBe("POST");
    expect(request.url).toBe("/api_keys/verify");
    expect(request.headers.authorization).toBe("Bearer sk_test_unit");
    expect(JSON.parse(request.body)).toEqual({ secret: "ak_coach" });
  });

  it("answers nobody when Clerk does not find the key", async () => {
    // arrange
    const clerkApi = await startClerkApiStub(UNKNOWN_KEY_ANSWER);
    const apiKeyVerifierPort = createApiKeyVerifierAdapter(
      createConfig({ CLERK_API_URL: clerkApi.baseUrl }),
    );

    // act
    const holder = await apiKeyVerifierPort
      .verify("ak_unknown")
      .finally(clerkApi.stop);

    // assert
    expect(holder).toBeNull();
  });
});
