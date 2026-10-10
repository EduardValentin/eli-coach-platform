import { readClerkSignUpMode } from "../support/clerk-instance";
import { expect, test } from "../support/fixtures";

test(
  "the hosted sign-in page offers no way to sign up",
  { tag: "@completeness" },
  async ({ page, publicNav, accountPortal }) => {
    // arrange
    await page.goto("/store");
    await publicNav.expectSignedOut();

    // act
    await publicNav.openSignIn();

    // assert
    await accountPortal.expectNoSignUpOffered();
  },
);

test(
  "the Clerk instance refuses sign-ups",
  { tag: "@completeness" },
  async ({ request }) => {
    // arrange, act
    const mode = await readClerkSignUpMode(request);

    // assert
    expect(mode).toBe("restricted");
  },
);
