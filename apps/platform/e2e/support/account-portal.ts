import { expect, type Page } from "@playwright/test";

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

  private get signUpLink() {
    return this.page.getByRole("link", { name: "Sign up" });
  }

  // Every entry point (SignInButton, the protected-portal redirect) lands on
  // the hosted sign-in page first; a brand-new visitor follows its "Sign up"
  // link rather than landing on /sign-up directly.
  async chooseSignUp(): Promise<void> {
    await this.signUpLink.click();
  }

  // A user-visible signal that the visitor has landed on the hosted Account
  // Portal's email step (sign-in or sign-up — both start here) rather than
  // anywhere in this app, which renders no such form of its own.
  async expectEmailStepVisible(): Promise<void> {
    await expect(this.emailField).toBeVisible();
  }

  async signUpWithEmail(email: string): Promise<void> {
    await this.submitUntilAdvanced({
      fillField: () => this.emailField.fill(email),
      waitForAdvance: () => this.codeField.waitFor({ state: "visible", timeout: ADVANCE_TIMEOUT_MS }),
    });
  }

  async signInWithEmail(email: string): Promise<void> {
    await this.submitUntilAdvanced({
      fillField: () => this.emailField.fill(email),
      waitForAdvance: () => this.codeField.waitFor({ state: "visible", timeout: ADVANCE_TIMEOUT_MS }),
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
