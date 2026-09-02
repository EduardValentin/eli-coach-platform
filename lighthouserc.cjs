const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// `pnpm test:lighthouse` runs no dotenv step of its own — load the repo root
// .env the same way apps/platform/react-router.config.ts does, so a
// developer's real Clerk keys (see CLERK_SECRET_KEY below) are picked up
// without extra setup. Safe to layer over CI, which has no such file.
const repoRootEnvFile = path.join(__dirname, ".env");
if (fs.existsSync(repoRootEnvFile)) {
  process.loadEnvFile(repoRootEnvFile);
}

// The real Development instance publishable key. This is a public value by
// design — Clerk publishable keys identify the instance and ship in every
// browser bundle — so hardcoding it here is not a secret leak. It has to be
// the real key so clerk-js actually loads and initializes against the real
// dev instance during the audit. Copied from the CLERK_PUBLISHABLE_KEY value
// in the repo root .env.
const LIGHTHOUSE_CLERK_PUBLISHABLE_KEY =
  "pk_test_ZGlzdGluY3QtbWFzdGlmZi0xMzUzLmNsZXJrLmFjY291bnRzLmRldiQ";
const LIGHTHOUSE_CLERK_SIGN_IN_URL = "https://distinct-mastiff-1353.accounts.dev/sign-in";
const LIGHTHOUSE_MANAGEMENT_API_SECRET = "lighthouse-audit-dummy-management-api-secret-value";

// Unlike the publishable key, CLERK_SECRET_KEY cannot be a dummy value here.
// clerkMiddleware runs on every request, including these public pages, and a
// Development instance's *first* visit from a cookie-less browser — which is
// every Lighthouse run, since it wipes the Chrome profile before each pass —
// is answered with a redirect through Clerk's own "dev browser" handshake.
// Completing that handshake back on our server fetches the instance's JWKS
// from Clerk's Backend API, which itself requires authenticating with a real
// secret key: a well-formed-but-fake one fails there with "Handshake token
// verification failed: ... Secret Key is invalid", which surfaces as a full
// 500 on every audited page — not a score deduction, a hard failure of every
// Lighthouse category. (This is why "anonymous pages never call the Backend
// API" doesn't hold for a Development instance's SSR middleware — only a
// signed-in request would call it for session data, but every request, signed
// in or not, needs it once to complete this handshake.)
function requireRealClerkSecretKey() {
  const value = process.env.CLERK_SECRET_KEY;
  if (!value || value === "replace-me") {
    throw new Error(
      "CLERK_SECRET_KEY is required to run the Lighthouse SSR audit (see the " +
        "comment above this check in lighthouserc.cjs for why a dummy value " +
        "doesn't work). Locally: run `pnpm secrets:local:prepare` and fill in " +
        "the real Development instance secret key from the Clerk Dashboard. " +
        "In CI: the CLERK_SECRET_KEY repository secret must be set to that " +
        "same Development instance value.",
    );
  }
  return value;
}

// The audited pages never publish or read Store assets, but runtime env
// validation requires a non-empty ASSET_ROOT. A fresh tmp dir keeps
// this hermetic — no dependency on `local/assets/` existing or being
// writable — and works identically in CI and on a developer machine.
const lighthouseAssetRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "eli-coach-platform-lighthouse-assets-"),
);

// Mutating process.env here, rather than threading an `env` option through
// lhci, is what actually reaches the server: lhci spawns `startServerCommand`
// inheriting this process's environment, exactly like any other child
// process.
Object.assign(process.env, {
  CLERK_PUBLISHABLE_KEY: LIGHTHOUSE_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: requireRealClerkSecretKey(),
  CLERK_SIGN_IN_URL: LIGHTHOUSE_CLERK_SIGN_IN_URL,
  MANAGEMENT_API_SECRET: LIGHTHOUSE_MANAGEMENT_API_SECRET,
  ASSET_ROOT: lighthouseAssetRoot,
  // Matches this workflow's default (`vars.WAITLIST_MODE || 'true'` in
  // ci.yml); a developer's shell does not normally export this, so it
  // defaults the same way locally instead of falling through to the
  // runtime schema's own default.
  WAITLIST_MODE: process.env.WAITLIST_MODE ?? "true",
  PORT: "3000",
});

module.exports = {
  ci: {
    collect: {
      // There is no prerendered HTML to point a static server at: every
      // route is request-time SSR now (see ARCHITECTURE.md's Rendering
      // Strategy). `pnpm build` must already have produced
      // apps/platform/build/{client,server} before this runs — CI's
      // "Build workspace" step does that; `AGENTS.md`'s local gate list
      // runs `pnpm build` ahead of `pnpm test:lighthouse` for the same
      // reason.
      startServerCommand:
        "cd apps/platform && node ./node_modules/@react-router/serve/bin.js ./build/server/index.js",
      startServerReadyPattern: "http://",
      startServerReadyTimeout: 30_000,
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        // Chrome cannot run its own sandbox as root and the Claude web
        // sandbox has no display; both flags apply only there, never in CI.
        chromeFlags:
          process.getuid?.() === 0 ? "--no-sandbox --headless=new" : "",
      },
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/blog/",
        "http://localhost:3000/privacy/",
        "http://localhost:3000/terms/",
      ],
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 1 }],
        // The best-practices *category* score is asserted per-audit below,
        // not as a single "categories:best-practices" minScore, because two
        // of its audits — third-party-cookies (weight 5) and
        // inspector-issues (weight 1), 6 of the category's 15 weight-bearing
        // audits (total declared weight 29, per lighthouse's default-config)
        // — fail unconditionally against this Clerk Development instance and
        // cannot be fixed from application code: clerk-js's first request to
        // the Frontend API (https://distinct-mastiff-1353.clerk.accounts.dev)
        // gets Cloudflare bot-management cookies (`__cf_bm`, `_cfuvid`) set
        // on *that* domain, which Chrome's third-party-cookie and Issues
        // panel audits flag regardless of purpose. This is a Development
        // instance limitation, not a defect: Clerk's documented fix is a
        // custom Frontend API domain (CNAME), which is a Production-only
        // feature — this app has no Production Clerk instance yet (see
        // docs/CLERK.md). A capped `categories:best-practices` minScore
        // would hide a real regression in whatever weight-29 room is left
        // under the cap; asserting every other best-practices audit
        // individually at full strength does not. That's every remaining
        // weight-bearing audit, including two that are always
        // `notApplicable` for this config and so always score 1 for
        // assertion purposes (lhci treats notApplicable as a pass):
        // `font-size` (a mobile-only legibility check) is permanently inert
        // under this config's `preset: "desktop"`, and `redirects-http`
        // (checks HTTP→HTTPS redirection) is permanently inert auditing
        // `http://localhost`, which is plain HTTP with nothing to redirect
        // from. Both stay asserted so a future config change that makes
        // either applicable again is still gated.
        "is-on-https": ["error", { minScore: 1 }],
        "redirects-http": ["error", { minScore: 1 }],
        "geolocation-on-start": ["error", { minScore: 1 }],
        "notification-on-start": ["error", { minScore: 1 }],
        "paste-preventing-inputs": ["error", { minScore: 1 }],
        "image-aspect-ratio": ["error", { minScore: 1 }],
        "image-size-responsive": ["error", { minScore: 1 }],
        viewport: ["error", { minScore: 1 }],
        "font-size": ["error", { minScore: 1 }],
        doctype: ["error", { minScore: 1 }],
        charset: ["error", { minScore: 1 }],
        deprecations: ["error", { minScore: 1 }],
        "errors-in-console": ["error", { minScore: 1 }],
      },
    },
  },
};
