module.exports = {
  ci: {
    collect: {
      staticDistDir: "apps/platform/build/client",
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        // Chrome cannot run its own sandbox as root and the Claude web
        // sandbox has no display; both flags apply only there, never in CI.
        chromeFlags:
          process.getuid?.() === 0 ? "--no-sandbox --headless=new" : "",
      },
      // Request-time SSR routes cannot be audited through staticDistDir.
      url: [
        "http://localhost/",
        "http://localhost/blog/",
        "http://localhost/privacy/",
        "http://localhost/terms/",
      ],
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 1 }],
      },
    },
  },
};
