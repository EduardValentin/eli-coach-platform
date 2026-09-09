import { createClerkClient, type ClerkClient } from "@clerk/backend";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test as base, expect } from "@playwright/test";
import type { AccountRole } from "@eli-coach-platform/domain";
import pg from "pg";

import { AccountPortal } from "./account-portal";
import { recordCreatedEmail } from "./clerk-users";
import { requireEnv } from "./env";
import { PublicNav } from "./public-nav";
import { resolveRunId } from "./run-id";

type PlatformFixtures = {
  publicNav: PublicNav;
  accountPortal: AccountPortal;
  testEmail: string;
  // Creates the Clerk identity behind testEmail without an accounts row —
  // what an uninvited person who somehow holds a Clerk user looks like.
  createClerkUser: () => Promise<string>;
  // Creates the Clerk identity and the accounts row the app would otherwise
  // refuse. Direct DB arrangement stands in for the coach's invitation flow,
  // which does not exist yet — a real external input, not a backdoor.
  provisionAccount: (role: AccountRole) => Promise<void>;
  // Composes publicNav + accountPortal into the one arrangement step nearly
  // every journey needs — an authenticated session to start from.
  signIn: () => Promise<void>;
};

// One Clerk Backend client and one Postgres pool per worker process: role
// seeding and email-to-subject-id lookups are the only server-side reaches
// this suite makes, and both are cheap to share across every test a worker
// runs rather than opening a fresh connection per test.
type WorkerFixtures = {
  clerkBackendClient: ClerkClient;
  databasePool: pg.Pool;
};

// Unique per test, not per email-lookup, so a rerun with the same worker
// process never collides with a previous run's Clerk users or accounts rows
// — the whole point of the +clerk_test convention being namespaced this way.
// Resolved (not generated) here: global-setup.ts already generated this
// run's id and published it via run-id.ts's environment variable before this
// worker process started, so every email this worker mints and every email
// global-teardown.ts later reads back agree on the same run.
const RUN_ID = resolveRunId();
let sequence = 0;

function nextTestEmail(): string {
  sequence += 1;
  // Clerk treats any address carrying a `+clerk_test` subaddress as a test
  // email that accepts the fixed OTP code instead of sending a real one —
  // https://clerk.com/docs/guides/development/testing/test-emails-and-phones
  // documents it as `local+clerk_test@domain`. The run/sequence marker sits
  // *before* that subaddress so `+clerk_test` stays the exact tag Clerk
  // documents, rather than risking a second `+` segment its matcher may not
  // recognize.
  return `e2e-${RUN_ID}-${sequence}+clerk_test@evoa.fit`;
}

export const test = base.extend<PlatformFixtures, WorkerFixtures>({
  clerkBackendClient: [
    // Playwright inspects this signature to resolve fixture dependencies;
    // the first param must stay a destructuring pattern even when this
    // fixture needs none of them.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await use(createClerkClient({ secretKey: requireEnv("CLERK_SECRET_KEY") }));
    },
    { scope: "worker" },
  ],

  // Direct DB arrangement, not an app entry point: role assignment has no
  // user-facing flow yet (there's no admin UI to promote an account), so
  // this stands in for the operational step that will eventually do it. See
  // AGENTS.md's seam guidance — this is a real external input (the
  // database), not a backdoor into app behavior a real user could reach.
  databasePool: [
    // Playwright inspects this signature to resolve fixture dependencies;
    // the first param must stay a destructuring pattern even when this
    // fixture needs none of them.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const pool = new pg.Pool({
        host: requireEnv("DATABASE_HOST"),
        port: Number(requireEnv("DATABASE_PORT")),
        database: requireEnv("DATABASE_NAME"),
        user: requireEnv("DATABASE_USER"),
        password: requireEnv("DATABASE_PASSWORD"),
      });

      await use(pool);
      await pool.end();
    },
    { scope: "worker" },
  ],

  // Overrides the built-in `page` fixture so every test gets the bot-
  // protection bypass before it ever navigates — this Clerk instance has
  // captcha on, and this token is its documented bypass for automated
  // browsers. Every other fixture below that depends on `page` receives
  // this same instance, so nothing has to remember to call it per spec.
  page: async ({ page }, use) => {
    await setupClerkTestingToken({ page });
    await use(page);
  },

  publicNav: async ({ page }, use) => {
    await use(new PublicNav(page));
  },

  accountPortal: async ({ page }, use) => {
    await use(new AccountPortal(page));
  },

  // Playwright inspects this signature to resolve fixture dependencies;
  // the first param must stay a destructuring pattern even when this
  // fixture needs none of them.
  // eslint-disable-next-line no-empty-pattern
  testEmail: async ({}, use) => {
    const email = nextTestEmail();
    // Recorded before this test does anything with it, so a run-scoped
    // cleanup registry exists even for the failure paths that never reach a
    // real Clerk sign-up (see clerk-users.ts and global-teardown.ts).
    recordCreatedEmail(email, RUN_ID);
    await use(email);
  },

  createClerkUser: async ({ clerkBackendClient, testEmail }, use) => {
    await use(async () => {
      const user = await clerkBackendClient.users.createUser({
        emailAddress: [testEmail],
      });

      return user.id;
    });
  },

  provisionAccount: async ({ createClerkUser, databasePool }, use) => {
    await use(async (role: AccountRole) => {
      const authSubjectId = await createClerkUser();

      await databasePool.query(
        "INSERT INTO app.accounts (auth_subject_id, role) VALUES ($1, $2)",
        [authSubjectId, role],
      );
    });
  },

  signIn: async ({ publicNav, accountPortal, testEmail }, use) => {
    await use(async () => {
      await publicNav.signIn();
      await accountPortal.signInWithEmail(testEmail);
      await accountPortal.completeEmailOtp();
    });
  },
});

export { expect };
