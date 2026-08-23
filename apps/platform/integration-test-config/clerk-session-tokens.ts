import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";

const KEY_ID = "integration-suite-key";
const ISSUER = "https://clerk.integration.test";
/**
 * Clerk stamps the origin a token was minted for, and the adapter refuses one
 * minted for anywhere else. Matching `PUBLIC_APP_URL` is what makes these
 * tokens the shape a real one has.
 */
export const AUTHORIZED_PARTY = "http://localhost:3000";
const SESSION_TOKEN_LIFETIME_SECONDS = 60;

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

/** The public half in the shape Clerk's JWKS endpoint returns. */
export const publicJwk = {
  ...publicKey.export({ format: "jwk" }),
  alg: "RS256",
  kid: KEY_ID,
  use: "sig",
};

function base64Url(value: Buffer | string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signToken(options: {
  authorizedParty?: string;
  expiresInSeconds: number;
  key: KeyObject;
  sessionId: string;
  subjectId: string;
}): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(
    JSON.stringify({ alg: "RS256", kid: KEY_ID, typ: "JWT" }),
  );
  const payload = base64Url(
    JSON.stringify({
      azp: options.authorizedParty ?? AUTHORIZED_PARTY,
      exp: issuedAt + options.expiresInSeconds,
      iat: issuedAt,
      iss: ISSUER,
      nbf: issuedAt - 5,
      sid: options.sessionId,
      sub: options.subjectId,
    }),
  );
  const signature = base64Url(
    sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), options.key),
  );

  return `${header}.${payload}.${signature}`;
}

/** A genuine RS256 session token, so the adapter verifies a real signature. */
export function mintSessionToken(options: {
  authorizedParty?: string;
  expiresInSeconds?: number;
  sessionId: string;
  subjectId: string;
}): string {
  return signToken({
    authorizedParty: options.authorizedParty,
    expiresInSeconds: options.expiresInSeconds ?? SESSION_TOKEN_LIFETIME_SECONDS,
    key: privateKey,
    sessionId: options.sessionId,
    subjectId: options.subjectId,
  });
}

/** Correctly formed and correctly signed — by a key the JWKS never advertises. */
export function mintForeignSessionToken(options: {
  sessionId: string;
  subjectId: string;
}): string {
  const foreign = generateKeyPairSync("rsa", { modulusLength: 2048 });

  return signToken({
    expiresInSeconds: SESSION_TOKEN_LIFETIME_SECONDS,
    key: foreign.privateKey,
    sessionId: options.sessionId,
    subjectId: options.subjectId,
  });
}

/**
 * `__client_uat` is how Clerk's backend knows a session exists on this domain at
 * all; without it a request carrying only `__session` reads as signed out.
 */
export function signedInHeaders(token: string): HeadersInit {
  const signedInAt = Math.floor(Date.now() / 1000);

  return { Cookie: `__session=${token}; __client_uat=${signedInAt}` };
}
