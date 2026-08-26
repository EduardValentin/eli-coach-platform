import { loadRuntimeEnvironment } from "@eli-coach-platform/config";

/**
 * Signs a throwaway identity in through Clerk for real and prints the cookies a
 * request needs to arrive authenticated, so the sign-in flow can be exercised
 * end to end without a browser.
 *
 * A development instance accepts any `+clerk_test` address with the fixed code
 * `424242` and sends no email, so this reaches the real Frontend API, mints a
 * real session, and the application verifies it against Clerk's real JWKS —
 * nothing here is stubbed.
 *
 * Development instances only. It creates a user in whichever Clerk instance the
 * environment points at, and refuses to run against a production key.
 */

const TEST_VERIFICATION_CODE = "424242";
const DEFAULT_IDENTIFIER = "qa+clerk_test@example.com";

type FapiResult = { body: Record<string, unknown>; status: number };

async function main(): Promise<void> {
  const environment = loadRuntimeEnvironment(process.env);
  const publishableKey = environment.CLERK_PUBLISHABLE_KEY;

  if (!publishableKey.startsWith("pk_test_")) {
    throw new Error(
      "Refusing to run: this creates a user and only a Clerk development instance accepts the test code.",
    );
  }

  const identifier = process.argv[2] ?? DEFAULT_IDENTIFIER;

  if (!identifier.includes("+clerk_test")) {
    throw new Error(
      `Refusing to run: ${identifier} is not a Clerk test address, so a real email would be sent.`,
    );
  }

  const frontendApi = decodeFrontendApiHost(publishableKey);

  if (!environment.PUBLIC_APP_URL) {
    throw new Error(
      "PUBLIC_APP_URL is required: Clerk stamps the authorized party from the Origin this is minted for, and the application refuses a token minted for anywhere else.",
    );
  }

  const session = await signIn({
    appOrigin: new URL(environment.PUBLIC_APP_URL).origin,
    frontendApi,
    identifier,
    secretKey: environment.CLERK_SECRET_KEY,
  });

  process.stdout.write(`${session}\n`);
}

function decodeFrontendApiHost(publishableKey: string): string {
  return Buffer.from(publishableKey.replace(/^pk_test_/, ""), "base64")
    .toString("utf8")
    .replace(/\$$/, "");
}

async function signIn(options: {
  appOrigin: string;
  frontendApi: string;
  identifier: string;
  secretKey: string;
}): Promise<string> {
  const devBrowserToken = await requestDevBrowserToken(options.frontendApi);

  await ensureUserExists(options);

  const cookies: string[] = [];
  const post = (path: string, form: Record<string, string>): Promise<FapiResult> =>
    postToFrontendApi({
      appOrigin: options.appOrigin,
      cookies,
      devBrowserToken,
      form,
      frontendApi: options.frontendApi,
      path,
    });

  const created = await post("/v1/client/sign_ins", {
    identifier: options.identifier,
  });
  const attempt = readResponse(created);
  const signInId = attempt.id as string;
  const emailFactor = (
    attempt.supported_first_factors as { email_address_id?: string; strategy: string }[]
  ).find((factor) => factor.strategy === "email_code");

  if (!signInId || !emailFactor?.email_address_id) {
    throw new Error("Clerk offered no email code factor for this identity.");
  }

  await post(`/v1/client/sign_ins/${signInId}/prepare_first_factor`, {
    email_address_id: emailFactor.email_address_id,
    strategy: "email_code",
  });

  const verified = await post(`/v1/client/sign_ins/${signInId}/attempt_first_factor`, {
    code: TEST_VERIFICATION_CODE,
    strategy: "email_code",
  });
  const sessionId = readResponse(verified).created_session_id as string;

  if (!sessionId) {
    throw new Error(`Clerk did not complete the sign-in: ${JSON.stringify(verified.body)}`);
  }

  const token = await post(`/v1/client/sessions/${sessionId}/tokens`, {});
  const sessionToken = token.body.jwt as string;

  if (!sessionToken) {
    throw new Error("Clerk issued no session token.");
  }

  // `__client_uat` is how Clerk's backend knows a session exists on this domain
  // at all, and a development instance additionally wants the dev-browser JWT
  // here — with only `__session` the request reads as signed out.
  return [
    `__session=${sessionToken}`,
    `__client_uat=${Math.floor(Date.now() / 1000)}`,
    `__clerk_db_jwt=${devBrowserToken}`,
  ].join("; ");
}

async function requestDevBrowserToken(frontendApi: string): Promise<string> {
  const response = await fetch(`https://${frontendApi}/v1/dev_browser`, {
    method: "POST",
  });
  const body = (await response.json()) as { token?: string };

  if (!body.token) {
    throw new Error(`Clerk issued no development browser token (${response.status}).`);
  }

  return body.token;
}

/**
 * Sign-up through the Frontend API is gated by bot protection, which a script
 * cannot answer. Creating the identity through the Backend API is both possible
 * and closer to what a fixture wants: the flow under test is the sign-in.
 */
async function ensureUserExists(options: {
  identifier: string;
  secretKey: string;
}): Promise<void> {
  const authorization = { authorization: `Bearer ${options.secretKey}` };
  const existing = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(options.identifier)}`,
    { headers: authorization },
  );
  const found = (await existing.json()) as unknown[];

  if (Array.isArray(found) && found.length > 0) {
    return;
  }

  const created = await fetch("https://api.clerk.com/v1/users", {
    body: JSON.stringify({ email_address: [options.identifier] }),
    headers: { ...authorization, "content-type": "application/json" },
    method: "POST",
  });

  if (!created.ok) {
    throw new Error(
      `Clerk refused to create the test identity (${created.status}): ${await created.text()}`,
    );
  }
}

async function postToFrontendApi(options: {
  appOrigin: string;
  cookies: string[];
  devBrowserToken: string;
  form: Record<string, string>;
  frontendApi: string;
  path: string;
}): Promise<FapiResult> {
  const url = `https://${options.frontendApi}${options.path}?__clerk_db_jwt=${options.devBrowserToken}`;
  const response = await fetch(url, {
    body: new URLSearchParams(options.form).toString(),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: options.cookies.join("; "),
      origin: options.appOrigin,
    },
    method: "POST",
  });

  for (const cookie of response.headers.getSetCookie()) {
    options.cookies.push(cookie.split(";")[0]!);
  }

  return { body: (await response.json()) as Record<string, unknown>, status: response.status };
}

function readResponse(result: FapiResult): Record<string, unknown> {
  const response = result.body.response as Record<string, unknown> | undefined;

  if (!response) {
    throw new Error(`Clerk refused the request (${result.status}): ${JSON.stringify(result.body)}`);
  }

  return response;
}

await main();
