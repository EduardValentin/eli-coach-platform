const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const LIGHTHOUSE_CLERK_PUBLISHABLE_KEY =
  "pk_test_ZGlzdGluY3QtbWFzdGlmZi0xMzUzLmNsZXJrLmFjY291bnRzLmRldiQ";
const LIGHTHOUSE_CLERK_SECRET_KEY = "sk_test_lighthouseAuditDummySecretKey";
const LIGHTHOUSE_CLERK_SIGN_IN_URL =
  "https://distinct-mastiff-1353.accounts.dev/sign-in";
const LIGHTHOUSE_CLERK_SIGN_UP_URL =
  "https://distinct-mastiff-1353.accounts.dev/sign-up";
const LIGHTHOUSE_MANAGEMENT_API_SECRET =
  "lighthouse-audit-dummy-management-api-secret-value";

// A Development instance redirects every cookieless page request through
// Clerk's dev-browser handshake, which a Production visitor never sees and
// which fails with a 500 against the dummy secret key. The middleware only
// checks that this cookie is present, so any value skips the handshake.
const LIGHTHOUSE_CLERK_DEV_BROWSER_COOKIE = "__clerk_db_jwt=lighthouse-audit";

Object.assign(process.env, {
  BOT_DETECTION_PROVIDER: "static",
  CLERK_PUBLISHABLE_KEY: LIGHTHOUSE_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: LIGHTHOUSE_CLERK_SECRET_KEY,
  CLERK_SIGN_IN_URL: LIGHTHOUSE_CLERK_SIGN_IN_URL,
  CLERK_SIGN_UP_URL: LIGHTHOUSE_CLERK_SIGN_UP_URL,
  MANAGEMENT_API_SECRET: LIGHTHOUSE_MANAGEMENT_API_SECRET,
  PRODUCT_EMAIL_PROVIDER: "memory",
  PUBLIC_APP_URL: "http://localhost:3000",
  STORE_ASSET_ROOT: fs.mkdtempSync(
    path.join(os.tmpdir(), "eli-coach-platform-lighthouse-store-assets-"),
  ),
  CLIENT_RESOURCE_ROOT: fs.mkdtempSync(
    path.join(os.tmpdir(), "eli-coach-platform-lighthouse-client-resources-"),
  ),
  EXERCISE_VIDEO_ROOT: fs.mkdtempSync(
    path.join(os.tmpdir(), "eli-coach-platform-lighthouse-exercise-videos-"),
  ),
  RECIPE_PHOTO_ROOT: fs.mkdtempSync(
    path.join(os.tmpdir(), "eli-coach-platform-lighthouse-recipe-photos-"),
  ),
  PORT: "3000",
});

module.exports = {
  ci: {
    collect: {
      startServerCommand:
        "cd apps/platform && node ./node_modules/@react-router/serve/bin.cjs ./build/server/index.js",
      startServerReadyPattern: "http://",
      startServerReadyTimeout: 30_000,
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        extraHeaders: JSON.stringify({
          Cookie: LIGHTHOUSE_CLERK_DEV_BROWSER_COOKIE,
        }),
        // Only the root-run Claude web sandbox needs these.
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
        redirects: ["error", { minScore: 1 }],
        // Best practices is asserted per audit: third-party-cookies and
        // inspector-issues always fail on the Clerk Development instance's
        // Cloudflare cookies, which only a Production custom domain removes.
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
