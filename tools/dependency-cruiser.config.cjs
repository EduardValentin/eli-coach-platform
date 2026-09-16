const path = require("node:path");

const TESTS = "\\.(test|integration\\.test)\\.[cm]?[jt]sx?$";
const APP = "^apps/platform/src/";
const FEATURES = "^apps/platform/src/features/";
const SURFACES = "^apps/platform/src/surfaces/";
const FEATURE_PUBLIC_FOLDERS = "(contracts|ui/shared|server/guards)/";

function surfaceToFeatureRule(surface, slice) {
  return {
    name: `surface-${surface}-to-feature`,
    comment: `R2: surfaces/${surface} reaches a feature only through ui/${slice}/, ui/shared/, contracts/, server/guards/ and routes.ts.`,
    severity: "error",
    from: { path: `${SURFACES}${surface}/` },
    to: {
      path: FEATURES,
      pathNot: [
        `${FEATURES}[^/]+/${FEATURE_PUBLIC_FOLDERS}`,
        `${FEATURES}[^/]+/ui/${slice}/`,
        `${FEATURES}[^/]+/routes\\.ts$`,
      ],
    },
  };
}

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment: "R30: no dependency cycles, including between domain slices.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "feature-internals",
      comment: "R3: a feature imports another feature only through contracts/, ui/shared/ or server/guards/.",
      severity: "error",
      from: { path: `${FEATURES}([^/]+)/`, pathNot: `${FEATURES}[^/]+/data/schema\\.server\\.ts$` },
      to: { path: `${FEATURES}(?!$1/)[^/]+/`, pathNot: `${FEATURES}[^/]+/${FEATURE_PUBLIC_FOLDERS}` },
    },
    {
      name: "feature-schema-foreign-key",
      comment: "R3 carve-out: data/schema.server.ts may import another feature's data/schema.server.ts for a foreign key and nothing else private.",
      severity: "error",
      from: { path: `${FEATURES}([^/]+)/data/schema\\.server\\.ts$` },
      to: {
        path: `${FEATURES}(?!$1/)[^/]+/`,
        pathNot: [`${FEATURES}[^/]+/${FEATURE_PUBLIC_FOLDERS}`, `${FEATURES}[^/]+/data/schema\\.server\\.ts$`],
      },
    },
    surfaceToFeatureRule("public-site", "public"),
    surfaceToFeatureRule("client-portal", "client"),
    surfaceToFeatureRule("coach-portal", "coach"),
    {
      name: "surface-to-surface",
      comment: "R4: a surface never imports another surface.",
      severity: "error",
      from: { path: `${SURFACES}([^/]+)/` },
      to: { path: `${SURFACES}(?!$1/)[^/]+/` },
    },
    {
      name: "surface-import",
      comment: "R7: only surfaces and the root registry import surfaces/**.",
      severity: "error",
      from: { path: APP, pathNot: [SURFACES, "^apps/platform/src/routes\\.ts$"] },
      to: { path: SURFACES },
    },
    {
      name: "composition-root",
      comment: "R5: nothing imports server/** except root.server.ts, the registry (fragments only) and server/guards/ consumers.",
      severity: "error",
      from: {
        path: APP,
        pathNot: [
          "^apps/platform/src/root\\.server\\.ts$",
          "^apps/platform/src/server/",
          "^apps/platform/src/routes\\.ts$",
          FEATURES,
        ],
      },
      to: { path: "^apps/platform/src/server/", pathNot: "^apps/platform/src/server/guards/" },
    },
    {
      name: "server-guards-consumers",
      comment: "A feature never imports the app's own guards; a surface reads only runtime config from them.",
      severity: "error",
      from: { path: [FEATURES, SURFACES, "^apps/platform/src/root(\\.server)?\\.tsx?$"] },
      to: { path: "^apps/platform/src/server/guards/", pathNot: "^apps/platform/src/server/guards/runtime-config-context\\.server\\.ts$" },
    },
    {
      name: "feature-server-private",
      comment: "Nothing in a feature outside server/ (api/, data/, email/, contracts/, ui/, routes.ts) imports its server/ outside guards/: composition and middleware are reachable only from the root and the container.",
      severity: "error",
      from: { path: `${FEATURES}([^/]+)/(?!server/)` },
      to: { path: `${FEATURES}$1/server/(?!guards/)` },
    },
    {
      name: "config-runtime-readers",
      comment: "Only the runtime-environment and database modules, the readyz controller, the migration config and the integration rig read the environment; everything else receives concern values.",
      severity: "error",
      from: {
        path: "^(apps|packages)/",
        pathNot: [
          "^apps/platform/src/server/(runtime-environment|database)\\.server\\.ts$",
          "^apps/platform/src/server/api/readyz-controller\\.server\\.ts$",
          "^apps/platform/db/",
          "^apps/platform/integration-test-config/",
        ],
      },
      to: { path: "^packages/config/src/runtime\\.ts$" },
    },
    {
      name: "features-never-reach-server",
      comment: "Features and the app's server folder stay acyclic: a feature imports nothing under server/.",
      severity: "error",
      from: { path: FEATURES },
      to: { path: "^apps/platform/src/server/" },
    },
    {
      name: "guards-construct-nothing",
      comment: "A guards module imports only the framework, its feature's contracts, domain slices, config types and sibling guards; its feature type comes from the composition as a type-only import.",
      severity: "error",
      from: { path: [`${FEATURES}[^/]+/server/guards/`, "^apps/platform/src/server/guards/"] },
      to: {
        path: "^(apps/platform/src|packages)/",
        pathNot: [
          `${FEATURES}[^/]+/(contracts|server/guards)/`,
          "^apps/platform/src/server/guards/",
          "^packages/domain/src/",
          "^packages/config/src/(index|base-path)\\.ts$",
          "^packages/config/src/concerns/",
        ],
        dependencyTypesNot: ["type-only"],
      },
    },
    {
      name: "feature-api-to-data",
      comment: "A controller or route never imports its feature's repositories or email adapters; the composition hands them in through ports.",
      severity: "error",
      from: { path: `${FEATURES}[^/]+/api/` },
      to: { path: `${FEATURES}[^/]+/(data|email)/` },
    },
    {
      name: "root-registry-to-server",
      comment: "The registry imports only the platform route fragment from server/.",
      severity: "error",
      from: { path: "^apps/platform/src/routes\\.ts$" },
      to: { path: "^apps/platform/src/server/", pathNot: "^apps/platform/src/server/api/routes\\.ts$" },
    },
    {
      name: "root-registry",
      comment: "F78: nothing imports routes.ts or the root modules except root.tsx and the registry itself.",
      severity: "error",
      from: { path: APP, pathNot: ["^apps/platform/src/root\\.tsx$"] },
      to: { path: "^apps/platform/src/(routes\\.ts|root\\.tsx|root\\.server\\.ts|root-error-page\\.tsx)$" },
    },
    {
      name: "browser-half",
      comment: "R6: a feature's ui/** never imports its data/, api/, email/ or server/ folders.",
      severity: "error",
      from: { path: `${FEATURES}[^/]+/ui/`, pathNot: `${FEATURES}[^/]+/ui/.*\\.server\\.ts$` },
      to: { path: `${FEATURES}[^/]+/(data|api|email|server)/` },
    },
    {
      name: "browser-half-loaders",
      comment: "R6: a loader beside a page reaches its feature's server folder only through server/guards/.",
      severity: "error",
      from: { path: `${FEATURES}[^/]+/ui/.*\\.server\\.ts$` },
      to: { path: `${FEATURES}[^/]+/(data/|api/|email/|server/(?!guards/))` },
    },
    {
      name: "route-thinness",
      comment: "A registered route module or its .server half never imports data/, email/, a controller, a domain subpath, the db package or server/ outside guards/.",
      severity: "error",
      from: {
        path: [
          `${FEATURES}[^/]+/api/[^/]+(?<!\\.server)\\.ts$`,
          `${FEATURES}[^/]+/ui/(public|client|coach)/[^/]+-page(\\.server)?\\.tsx?$`,
          `${SURFACES}[^/]+/(pages|api)/`,
          `${SURFACES}[^/]+/shell/layout(\\.server)?\\.tsx?$`,
          "^apps/platform/src/server/api/[^/]+(?<!\\.server)\\.ts$",
        ],
      },
      to: {
        path: [
          `${FEATURES}[^/]+/(data|email)/`,
          "-controller\\.server\\.ts$",
          "^packages/domain/",
          "^packages/db/",
          "^packages/infrastructure/src/(?!(http|pwa)/)",
          "^packages/config/src/runtime\\.ts$",
          "^apps/platform/src/server/(?!guards/)",
          `${FEATURES}[^/]+/server/(?!guards/)`,
        ],
        dependencyTypesNot: ["type-only"],
      },
    },
    {
      name: "domain-slices",
      comment: "Domain slices import each other only through the slice entry.",
      severity: "error",
      from: { path: "^packages/domain/src/([^/]+)/" },
      to: { path: "^packages/domain/src/(?!$1/)[^/]+/", pathNot: "^packages/domain/src/[^/]+/index\\.ts$" },
    },
    {
      name: "domain-no-externals",
      comment: "The domain package imports nothing outside itself.",
      severity: "error",
      from: { path: "^packages/domain/src/" },
      to: { dependencyTypesNot: ["local", "type-only"] },
    },
    {
      name: "infrastructure-subpaths",
      comment: "F77: infrastructure subpaths never import each other.",
      severity: "error",
      from: { path: "^packages/infrastructure/src/([^/]+)/" },
      to: { path: "^packages/infrastructure/src/(?!$1/)[^/]+/" },
    },
    {
      name: "infrastructure-browser-entries",
      comment: "A non-.server module in infrastructure never imports a .server module.",
      severity: "error",
      from: { path: "^packages/infrastructure/src/.*(?<!\\.server)\\.tsx?$" },
      to: { path: "^packages/infrastructure/src/.*\\.server\\.tsx?$" },
    },
    {
      name: "workspace-by-name-app",
      comment: "No relative path crosses the boundary from an app into a package.",
      severity: "error",
      from: { path: "^apps/" },
      to: { path: "^packages/", dependencyTypes: ["local"] },
    },
    {
      name: "workspace-by-name-packages",
      comment: "No relative path crosses the boundary from one package into another.",
      severity: "error",
      from: { path: "^packages/([^/]+)/" },
      to: { path: "^packages/(?!$1/)", dependencyTypes: ["local"] },
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true, pathNot: "\\?raw$" },
    },
    {
      name: "no-non-package-json",
      comment: "Every npm dependency is declared in the importing package's package.json.",
      severity: "error",
      from: {},
      to: { dependencyTypes: ["npm-no-pkg", "npm-unknown"] },
    },
    {
      name: "not-to-dev-dep",
      comment: "Production code never imports a devDependency.",
      severity: "error",
      from: {
        path: "^(apps|packages)/",
        pathNot: ["^apps/platform/src/routes\\.ts$", "/routes\\.ts$", "\\.config\\.[cm]?[jt]s$"],
      },
      to: { dependencyTypes: ["npm-dev"], dependencyTypesNot: ["type-only", "npm-peer"] },
    },
    {
      name: "no-production-import-of-tests",
      comment: "R34: production code never imports a test rig or a test fixture (test files themselves are excluded from the cruise).",
      severity: "error",
      from: { path: "^(apps|packages)/" },
      to: { path: ["/integration-test-config/", "/e2e/", "/test-support/"] },
    },
    {
      name: "no-orphans",
      comment: "A module nothing imports and that imports nothing is dead.",
      severity: "error",
      from: {
        orphan: true,
        pathNot: [
          "\\.d\\.ts$",
          "\\.css$",
          "^apps/platform/src/surfaces/client-portal/api/service-worker\\.js$",
          "^packages/config/src/test-support\\.ts$",
          "^apps/platform/src/server/test-support/request-args\\.ts$",
          "^apps/platform/src/routes\\.ts$",
          "^apps/platform/src/surfaces/coach-portal/api/readyz\\.ts$",
          "^apps/platform/src/surfaces/client-portal/api/readyz\\.ts$",
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: [TESTS, "^apps/platform/src/.*\\.integration\\.test\\.", "\\.d\\.ts$"] },
    tsPreCompilationDeps: "specify",
    tsConfig: { fileName: path.resolve(__dirname, "dependency-cruiser.tsconfig.json") },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"],
    },
    cache: { folder: "node_modules/.cache/dependency-cruiser" },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
