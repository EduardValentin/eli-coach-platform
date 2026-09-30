import { expect, type Frame, type Page } from "@playwright/test";

// Every test email is a Clerk `+clerk_test` address (see fixtures.ts), so the
// hosted Account Portal always accepts this fixed code instead of sending a
// real one — https://clerk.com/docs/guides/development/testing/test-emails-and-phones.
const CLERK_TEST_OTP_CODE = "424242";

// The hosted Account Portal runs an invisible bot-protection challenge
// (this Clerk instance's "captcha ON" setting) that finishes its async setup
// on its own schedule. Submitting before it settles has Continue silently
// drop the request: no error, no network call, the step just doesn't
// change. There's no readiness signal to wait on from outside Clerk's
// bundle, so this retries the submit a few times, each with a real wait for
// the *next* step's own content — not just any URL change, since Clerk's
// hosted pages rewrite query params (session nonces) on their own schedule
// too, which would satisfy a same-URL-or-not check without the user having
// moved anywhere.
const SUBMIT_ATTEMPTS = 4;
const ADVANCE_TIMEOUT_MS = 8_000;
const SIGN_UP_HAND_OFF_TIMEOUT_MS = 30_000;

const VERIFICATION_STEP = /verify/;

function isAccountPortalHost(hostname: string): boolean {
  return hostname.endsWith(".accounts.dev");
}

function isAccountPortalUrl(url: URL): boolean {
  return isAccountPortalHost(url.hostname);
}

export type SignUpHandOff = { expectReached: () => Promise<void> };

export class AccountPortal {
  constructor(private readonly page: Page) {}

  private get emailField() {
    return this.page.getByRole("textbox", { name: "Email address" });
  }

  private get continueButton() {
    return this.page.getByRole("button", { name: "Continue" });
  }

  private get codeField() {
    return this.page.getByRole("textbox", { name: "Enter verification code" });
  }

  // A user-visible signal that the visitor has landed on the hosted Account
  // Portal's email step rather than anywhere in this app, which renders no
  // such form of its own.
  async expectEmailStepVisible(): Promise<void> {
    await expect(this.emailField).toBeVisible();
  }

  async expectNoSignUpOffered(): Promise<void> {
    await this.expectEmailStepVisible();
    await expect(this.page.getByRole("link", { name: "Sign up" })).toHaveCount(
      0,
    );
  }

  async signInWithEmail(email: string): Promise<void> {
    await this.submitUntilAdvanced({
      fillField: () => this.emailField.fill(email),
      waitForAdvance: () =>
        this.codeField.waitFor({
          state: "visible",
          timeout: ADVANCE_TIMEOUT_MS,
        }),
    });
  }

  async completeEmailOtp(): Promise<void> {
    await this.submitUntilAdvanced({
      fillField: () => this.codeField.fill(CLERK_TEST_OTP_CODE),
      // Success here is Clerk redirecting back to `redirect_url` — off the
      // hosted domain and onto this app.
      waitForAdvance: () =>
        this.page.waitForURL((url) => !url.hostname.endsWith(".accounts.dev"), {
          timeout: ADVANCE_TIMEOUT_MS,
        }),
    });
  }

  async signUpFromInvitation(
    startSignUpHandOff: () => Promise<unknown>,
  ): Promise<void> {
    const portalPaths: string[] = [];
    const recordPortalPath = (frame: Frame) => {
      const url = new URL(frame.url());

      if (isAccountPortalHost(url.hostname)) {
        portalPaths.push(url.pathname);
      }
    };

    this.page.on("framenavigated", recordPortalPath);
    await startSignUpHandOff();
    await expect
      .poll(() => portalPaths.length, { timeout: SIGN_UP_HAND_OFF_TIMEOUT_MS })
      .toBeGreaterThan(0);
    await this.page.waitForURL((url) => !isAccountPortalHost(url.hostname));
    this.page.off("framenavigated", recordPortalPath);

    expect(portalPaths.filter((path) => VERIFICATION_STEP.test(path))).toEqual(
      [],
    );
  }

  async stopAtSignUpHandOff(): Promise<SignUpHandOff> {
    let handedOffTo: string | null = null;

    await this.page.route(isAccountPortalUrl, async (route) => {
      if (!route.request().isNavigationRequest()) {
        await route.fallback();
        return;
      }

      handedOffTo = route.request().url();
      await route.fulfill({ body: "", contentType: "text/html" });
    });

    return {
      expectReached: async () => {
        await expect
          .poll(() => handedOffTo, { timeout: SIGN_UP_HAND_OFF_TIMEOUT_MS })
          .not.toBeNull();
        await this.page.unroute(isAccountPortalUrl);
      },
    };
  }

  private async submitUntilAdvanced(options: {
    fillField: () => Promise<void>;
    waitForAdvance: () => Promise<unknown>;
  }): Promise<void> {
    await this.page.waitForLoadState("networkidle");

    for (let attempt = 1; attempt <= SUBMIT_ATTEMPTS; attempt += 1) {
      await options.fillField();
      await this.continueButton.click({ timeout: 2_000 }).catch(() => {});

      const advanced = await options
        .waitForAdvance()
        .then(() => true)
        .catch(() => false);

      if (advanced) {
        return;
      }
    }

    throw new Error(
      `Clerk hosted Account Portal step did not advance after ${SUBMIT_ATTEMPTS} submit attempts — ` +
        "likely the bot-protection challenge never settled. Rerun, or check the instance's captcha config.",
    );
  }
}
