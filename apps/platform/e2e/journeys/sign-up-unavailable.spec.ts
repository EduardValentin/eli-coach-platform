import { expect, test } from "../support/fixtures";
import { requireEnv } from "../support/env";

// A publishable key is the Frontend API host, base64-encoded with a trailing
// `$`, behind a `pk_test_`/`pk_live_` prefix.
function frontendApiHost(publishableKey: string): string {
  return Buffer.from(publishableKey.replace(/^pk_(test|live)_/, ""), "base64")
    .toString("utf8")
    .replace(/\$$/, "");
}

test("nobody is offered a way to sign up", async ({
  page,
  publicNav,
  accountPortal,
  request,
}) => {
  // arrange
  await page.goto("/store");
  await publicNav.expectSignedOut();

  // act
  await publicNav.signIn();

  // assert — the hosted page, and the instance setting behind it.
  await accountPortal.expectNoSignUpOffered();

  const environment = await request.get(
    `https://${frontendApiHost(requireEnv("CLERK_PUBLISHABLE_KEY"))}/v1/environment`,
  );
  const body = (await environment.json()) as {
    user_settings: { sign_up: { mode: string } };
  };
  expect(body.user_settings.sign_up.mode).toBe("restricted");
});
