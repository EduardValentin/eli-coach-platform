module.exports = {
  ci: {
    collect: {
      staticDistDir: "apps/platform/build/client",
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
      },
      url: [
        "http://localhost/",
        "http://localhost/blog/",
        "http://localhost/store/",
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
