import { generateKeyPairSync, sign } from "node:crypto";

import { loadIntegrationTestEnvironment } from "./runtime-environment";

/**
 * A session token as Clerk issues one: an RS256 JWT whose `kid` names a key in
 * the JWKS the Backend API serves. The suite mints its own keys and lets
 * WireMock serve the public half at `GET /v1/jwks`, so the application's real
 * Clerk adapter fetches, caches and verifies exactly as it does in production
 * — nothing here reaches inside `@clerk/backend`.
 */
const SIGNING_KEY_ID = "eli-coach-platform-integration-key";
const SESSION_TOKEN_LIFETIME_IN_SECONDS = 60;

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const { runtimeEnvironment } = loadIntegrationTestEnvironment();

export type SigningJsonWebKey = JsonWebKey & {
  alg: string;
  kid: string;
  use: string;
};

export type SessionTokenOptions = {
  /**
   * Defaults to now. A case holding the server clock at a named instant must
   * mint for that instant too, or Clerk rejects a token issued outside the
   * window a frozen server sees.
   */
  issuedAt?: Date;
  sessionId: string;
  subjectId: string;
};

export function clerkSigningJsonWebKey(): SigningJsonWebKey {
  return {
    ...publicKey.export({ format: "jwk" }),
    alg: "RS256",
    kid: SIGNING_KEY_ID,
    use: "sig",
  };
}

export function mintSessionToken(options: SessionTokenOptions): string {
  const issuedAt = Math.floor(
    (options.issuedAt ?? new Date()).getTime() / 1000,
  );
  const signingInput = [
    encodeSegment({ alg: "RS256", kid: SIGNING_KEY_ID, typ: "JWT" }),
    encodeSegment({
      azp: runtimeEnvironment.PUBLIC_APP_URL,
      exp: issuedAt + SESSION_TOKEN_LIFETIME_IN_SECONDS,
      iat: issuedAt,
      iss: frontendApiIssuer(runtimeEnvironment.CLERK_PUBLISHABLE_KEY),
      nbf: issuedAt,
      sid: options.sessionId,
      sub: options.subjectId,
    }),
  ].join(".");

  const signature = sign("sha256", Buffer.from(signingInput), privateKey);

  return `${signingInput}.${signature.toString("base64url")}`;
}

// A publishable key is the frontend API host, base64-encoded with a trailing
// `$`, behind a `pk_test_`/`pk_live_` prefix — which is how Clerk's own SDKs
// derive the issuer a token must carry.
function frontendApiIssuer(publishableKey: string): string {
  const encodedFrontendApi = publishableKey.replace(/^pk_(test|live)_/, "");
  const frontendApi = Buffer.from(encodedFrontendApi, "base64")
    .toString("utf8")
    .replace(/\$$/, "");

  return `https://${frontendApi}`;
}

function encodeSegment(segment: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(segment)).toString("base64url");
}
