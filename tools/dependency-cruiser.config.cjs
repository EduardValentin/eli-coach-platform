const { readdirSync } = require("node:fs");
const path = require("node:path");

const TESTS = "\\.(test|integration\\.test)\\.[cm]?[jt]sx?$";
const APP = "^apps/platform/src/";
const FEATURES = "^apps/platform/src/bounded-contexts/[^/]+/";
const COMPONENT = "(?!public/)[^/]+";
const BOUNDED_CONTEXT_PUBLIC = `${FEATURES}public/`;
const SURFACES = "^apps/platform/src/surfaces/";
const CONCEPT = "{concept}";

function flatOrInConceptFolder(patterns) {
  return patterns.flatMap((pattern) =>
    pattern.includes(CONCEPT)
      ? [pattern.replace(CONCEPT, ""), pattern.replace(CONCEPT, "[^/]+/")]
      : [pattern],
  );
}

const FEATURE_PUBLIC_FOLDERS = "(public|ui/shared|server/guards)/";
const FEATURE_SCHEMA = `${FEATURES}${COMPONENT}/data/schema\\.server\\.ts$`;
const ROUTE_MODULES = flatOrInConceptFolder([
  `${FEATURES}${COMPONENT}/api/${CONCEPT}[^/]+(?<!\\.server)\\.ts$`,
  `${FEATURES}${COMPONENT}/ui/(public|client|coach)/${CONCEPT}[^/]+-page\\.tsx$`,
  `${SURFACES}[^/]+/(pages|api)/`,
  `${SURFACES}[^/]+/shell/(access-)?layout(\\.server)?\\.tsx?$`,
  `${APP}composition-root/api/${CONCEPT}[^/]+(?<!\\.server)\\.ts$`,
]);

const BOUNDED_CONTEXTS = [
  ["operations", ["feature-flags"]],
  ["legal", ["legal"]],
  ["access", ["accounts"]],
  ["scheduling", ["coach-schedule", "assessment-calls"]],
  [
    "clients",
    [
      "clients",
      "client-profile",
      "client-resources",
      "notifications",
      "check-ins",
    ],
  ],
  ["programs", ["exercise-library", "nutrition-library"]],
  ["sales", ["store", "waitlist", "coaching-sales"]],
];

const FEATURE_ORDER = BOUNDED_CONTEXTS.flatMap(([, components]) => components);

const DOMAIN_SLICE_ORDER = [
  "shared",
  "exercise",
  "nutrition",
  "email-address",
  "feature-flag",
  "product",
  "cart",
  "acquisition",
  "download-grant",
  "waitlist",
  "account",
  "coach-availability",
  "coach-meeting-room",
  "coach-schedule",
  "assessment-call",
  "client",
  "notification",
  "client-settings",
  "measurement",
  "client-invitation",
  "client-profile",
  "client-onboarding",
  "client-journey",
  "client-roster",
  "client-resources",
  "check-in",
  "coaching-bundle",
  "payment-link",
  "coaching-subscription",
];

function foldersOf(directory) {
  return readdirSync(path.join(__dirname, "..", directory), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function componentFoldersOf(directory) {
  return foldersOf(directory).flatMap((boundedContext) =>
    foldersOf(path.join(directory, boundedContext))
      .filter((folder) => folder !== "public")
      .map((component) => ({ boundedContext, component })),
  );
}

function boundedContextPositionOf(component) {
  return BOUNDED_CONTEXTS.findIndex(([, components]) =>
    components.includes(component),
  );
}

function requireEveryComponentPlaced(directory) {
  const misplaced = componentFoldersOf(directory)
    .filter(({ boundedContext, component }) => {
      const position = boundedContextPositionOf(component);
      return (
        position !== -1 && BOUNDED_CONTEXTS[position][0] !== boundedContext
      );
    })
    .map(
      ({ boundedContext, component }) =>
        `${boundedContext}/${component} (BOUNDED_CONTEXTS places it in ${BOUNDED_CONTEXTS[boundedContextPositionOf(component)][0]})`,
    );

  if (misplaced.length > 0) {
    throw new Error(
      `Place every component of ${directory} under the bounded context BOUNDED_CONTEXTS assigns it; misplaced: ${misplaced.join(", ")}.`,
    );
  }
}

function requireEveryFolderOrdered({ directory, folders, order, orderName }) {
  const unordered = folders.filter((folder) => !order.includes(folder));

  if (unordered.length > 0) {
    throw new Error(
      `Place every folder of ${directory} in ${orderName}; missing: ${unordered.join(", ")}.`,
    );
  }
}

requireEveryFolderOrdered({
  directory: "apps/platform/src/bounded-contexts",
  folders: componentFoldersOf("apps/platform/src/bounded-contexts").map(
    ({ component }) => component,
  ),
  order: FEATURE_ORDER,
  orderName: "FEATURE_ORDER",
});
requireEveryComponentPlaced("apps/platform/src/bounded-contexts");
requireEveryFolderOrdered({
  directory: "packages/domain/src",
  folders: foldersOf("packages/domain/src"),
  order: DOMAIN_SLICE_ORDER,
  orderName: "DOMAIN_SLICE_ORDER",
});

function domainSliceOrderRule(slice, position) {
  const earlierSlices = DOMAIN_SLICE_ORDER.slice(0, position);

  return {
    name: `domain-slice-order-${slice}`,
    comment: `A domain slice imports only the slices before it in DOMAIN_SLICE_ORDER: ${slice} may import ${earlierSlices.join(", ") || "no other slice"}.`,
    severity: "error",
    from: { path: `^packages/domain/src/${slice}/` },
    to: {
      path: "^packages/domain/src/",
      pathNot: `^packages/domain/src/(${[...earlierSlices, slice].join("|")})/`,
    },
  };
}

function featureOrderRule(feature, position) {
  const earlierFeatures = FEATURE_ORDER.slice(0, position);
  const admittedBoundedContexts = BOUNDED_CONTEXTS.slice(
    0,
    boundedContextPositionOf(feature) + 1,
  ).map(([boundedContext]) => boundedContext);

  return {
    name: `feature-order-${feature}`,
    comment: `A feature imports only the features before it in FEATURE_ORDER and the public/ of its own and earlier bounded contexts: ${feature} may import ${earlierFeatures.join(", ") || "no other feature"} and ${admittedBoundedContexts.join(", ")} public/. Its data/schema.server.ts is held by feature-schema-foreign-key and feature-schema-imports-schemas-only instead.`,
    severity: "error",
    from: { path: `${FEATURES}${feature}/`, pathNot: FEATURE_SCHEMA },
    to: {
      path: FEATURES,
      pathNot: [
        `${FEATURES}(${[...earlierFeatures, feature].join("|")})/`,
        `^apps/platform/src/bounded-contexts/(${admittedBoundedContexts.join("|")})/public/`,
      ],
    },
  };
}

function surfaceToFeatureRule(surface, slice) {
  return {
    name: `surface-${surface}-to-feature`,
    comment: `R2: surfaces/${surface} reaches a feature only through ui/${slice}/, ui/shared/, public/, server/guards/ and routes.ts.`,
    severity: "error",
    from: { path: `${SURFACES}${surface}/` },
    to: {
      path: FEATURES,
      pathNot: [
        `${FEATURES}${COMPONENT}/${FEATURE_PUBLIC_FOLDERS}`,
        `${FEATURES}${COMPONENT}/ui/${slice}/`,
        `${FEATURES}${COMPONENT}/routes\\.ts$`,
        BOUNDED_CONTEXT_PUBLIC,
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
      comment:
        "R3: a feature imports another feature only through public/, ui/shared/ or server/guards/.",
      severity: "error",
      from: {
        path: `${FEATURES}(${COMPONENT})/`,
        pathNot: FEATURE_SCHEMA,
      },
      to: {
        path: `${FEATURES}(?!$1/)${COMPONENT}/`,
        pathNot: `${FEATURES}${COMPONENT}/${FEATURE_PUBLIC_FOLDERS}`,
      },
    },
    {
      name: "feature-schema-foreign-key",
      comment:
        "R3 carve-out: data/schema.server.ts may import any feature's data/schema.server.ts for a foreign key, before or after it in FEATURE_ORDER, and nothing else private.",
      severity: "error",
      from: { path: `${FEATURES}(${COMPONENT})/data/schema\\.server\\.ts$` },
      to: {
        path: `${FEATURES}(?!$1/)${COMPONENT}/`,
        pathNot: [
          `${FEATURES}${COMPONENT}/${FEATURE_PUBLIC_FOLDERS}`,
          FEATURE_SCHEMA,
        ],
      },
    },
    {
      name: "feature-schema-imports-schemas-only",
      comment:
        "A schema file sits outside FEATURE_ORDER, so another feature's data/schema.server.ts is the only thing of that feature it imports: not even its public folders.",
      severity: "error",
      from: { path: `${FEATURES}(${COMPONENT})/data/schema\\.server\\.ts$` },
      to: { path: `${FEATURES}(?!$1/)${COMPONENT}/${FEATURE_PUBLIC_FOLDERS}` },
    },
    ...FEATURE_ORDER.map(featureOrderRule),
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
      from: {
        path: APP,
        pathNot: [SURFACES, "^apps/platform/src/routes\\.ts$"],
      },
      to: { path: SURFACES },
    },
    {
      name: "composition-root",
      comment:
        "R5: nothing imports composition-root/** except root.server.ts, the registry (fragments only) and composition-root/guards/ consumers.",
      severity: "error",
      from: {
        path: APP,
        pathNot: [
          "^apps/platform/src/root\\.server\\.ts$",
          "^apps/platform/src/composition-root/",
          "^apps/platform/src/routes\\.ts$",
          FEATURES,
        ],
      },
      to: {
        path: "^apps/platform/src/composition-root/",
        pathNot: "^apps/platform/src/composition-root/guards/",
      },
    },
    {
      name: "feature-flag-overrides-root-only",
      comment:
        "The container and the runtime reader are the only production importers of composition-root/feature-flag-overrides/: the override reader and middleware reach a request through the composition root alone.",
      severity: "error",
      from: {
        path: APP,
        pathNot: [
          "^apps/platform/src/composition-root/container\\.server\\.ts$",
          "^apps/platform/src/composition-root/runtime-environment\\.ts$",
          "^apps/platform/src/composition-root/feature-flag-overrides/",
        ],
      },
      to: {
        path: "^apps/platform/src/composition-root/feature-flag-overrides/",
      },
    },
    {
      name: "server-guards-consumers",
      comment:
        "A feature never imports the app's own guards; a surface reads only runtime config from them.",
      severity: "error",
      from: {
        path: [
          FEATURES,
          SURFACES,
          "^apps/platform/src/root(\\.server)?\\.tsx?$",
        ],
      },
      to: {
        path: "^apps/platform/src/composition-root/guards/",
        pathNot:
          "^apps/platform/src/composition-root/guards/runtime-config-context\\.server\\.ts$",
      },
    },
    {
      name: "feature-server-private",
      comment:
        "Nothing in a feature outside server/ (adapters/, api/, data/, email/, public/, ui/, routes.ts) imports its server/ outside guards/: composition and middleware are reachable only from the root and the container.",
      severity: "error",
      from: { path: `${FEATURES}(${COMPONENT})/(?!server/)` },
      to: { path: `${FEATURES}$1/server/(?!guards/)` },
    },
    {
      name: "config-runtime-readers",
      comment:
        "Only the runtime reader, the container and database modules, the readyz controller, the migration config and the integration rig read the environment; everything else receives concern values and may import only their types.",
      severity: "error",
      from: {
        path: "^(apps|packages)/",
        pathNot: [
          "^apps/platform/src/composition-root/runtime-environment\\.ts$",
          "^apps/platform/src/composition-root/(container|database)\\.server\\.ts$",
          "^apps/platform/src/composition-root/api/readyz/readyz-controller\\.server\\.ts$",
          "^apps/platform/db/",
          "^apps/platform/integration-test-config/",
        ],
      },
      to: {
        path: [
          "^apps/platform/src/composition-root/runtime-environment\\.ts$",
          "^apps/platform/src/shared/database/connection\\.ts$",
        ],
        dependencyTypesNot: ["type-only"],
      },
    },
    {
      name: "features-never-reach-server",
      comment:
        "Features and the composition root stay acyclic: a feature imports nothing under composition-root/.",
      severity: "error",
      from: { path: FEATURES },
      to: { path: "^apps/platform/src/composition-root/" },
    },
    {
      name: "guards-construct-nothing",
      comment:
        "A guards module imports only the framework, its feature's public folder, domain slices, config types and sibling guards; its feature type comes from the composition as a type-only import.",
      severity: "error",
      from: {
        path: [
          `${FEATURES}${COMPONENT}/server/guards/`,
          "^apps/platform/src/composition-root/guards/",
        ],
      },
      to: {
        path: "^(apps/platform/src|packages)/",
        pathNot: [
          `${FEATURES}${COMPONENT}/(public|server/guards)/`,
          "^apps/platform/src/composition-root/guards/",
          "^packages/domain/src/",
          "^apps/platform/src/shared/http/base-path\\.ts$",
          "^apps/platform/src/shared/(email/product-email|submission-checks/bot-detection)-config\\.ts$",
          `${FEATURES}${COMPONENT}/config\\.server\\.ts$`,
        ],
        dependencyTypesNot: ["type-only"],
      },
    },
    {
      name: "clerk-confined",
      comment:
        "Clerk stays behind the accounts feature, the app root modules, the identity adapter and the test harnesses: nothing else names @clerk/*.",
      severity: "error",
      from: {
        pathNot: [
          `${FEATURES}accounts/`,
          "^apps/platform/src/(root\\.tsx|root\\.server\\.ts|root-error-page\\.tsx)$",
          `${FEATURES}clients/data/identity/`,
          "^apps/platform/test-support/",
          "^apps/platform/e2e/",
          "^apps/platform/integration-test-config/",
          "^lighthouserc\\.cjs$",
        ],
      },
      to: { path: "(^|/)@clerk/" },
    },
    {
      name: "sharp-confined",
      comment:
        "Image decoding stays behind the shared images concern: nothing else names sharp.",
      severity: "error",
      from: { pathNot: ["^apps/platform/src/shared/images/"] },
      to: { path: "(^|/)sharp(/|$)" },
    },
    {
      name: "react-dnd-confined",
      comment:
        "Drag and drop stays in the recipe builder: nothing else names react-dnd or react-dnd-touch-backend.",
      severity: "error",
      from: {
        pathNot: [
          `${FEATURES}nutrition-library/ui/coach/recipes/recipe-builder(-sections)?\\.tsx$`,
        ],
      },
      to: { path: "(^|/)react-dnd(-touch-backend)?(/|$)" },
    },
    {
      name: "pdf-rendering-confined",
      comment:
        "PDF rendering stays behind the shared documents concern: nothing else names pdfjs-dist or @napi-rs/canvas.",
      severity: "error",
      from: { pathNot: ["^apps/platform/src/shared/documents/"] },
      to: { path: "(^|/)(pdfjs-dist|@napi-rs/canvas)(/|$)" },
    },
    {
      name: "busboy-confined",
      comment:
        "Streaming multipart parsing stays in one http module: nothing else names @fastify/busboy.",
      severity: "error",
      from: {
        pathNot: [
          "^apps/platform/src/shared/http/streaming-form-data\\.server\\.ts$",
        ],
      },
      to: { path: "(^|/)@fastify/busboy(/|$)" },
    },
    {
      name: "file-type-confined",
      comment:
        "File format detection stays behind the shared documents concern: nothing else names file-type or @file-type/*.",
      severity: "error",
      from: { pathNot: ["^apps/platform/src/shared/documents/"] },
      to: { path: "(^|/)(file-type|@file-type/[^/]+)(/|$)" },
    },
    {
      name: "feature-api-to-data",
      comment:
        "A controller or route never imports its feature's repositories or email adapters; the composition hands them in through ports.",
      severity: "error",
      from: { path: `${FEATURES}${COMPONENT}/api/` },
      to: { path: `${FEATURES}${COMPONENT}/(data|email)/` },
    },
    {
      name: "feature-api-never-imports-ui",
      comment:
        "A feature's api/ never imports any feature's ui/: what a route module's clientAction shares with the browser half lives in public/ or a package's browser entry.",
      severity: "error",
      from: { path: `${FEATURES}${COMPONENT}/api/` },
      to: { path: `${FEATURES}${COMPONENT}/ui/` },
    },
    {
      name: "feature-shared-ui-never-imports-actor-ui",
      comment:
        "A feature's ui/shared/ serves every actor UI of that feature, so it never imports the feature's own ui/public/, ui/client/ or ui/coach/.",
      severity: "error",
      from: { path: `${FEATURES}(${COMPONENT})/ui/shared/` },
      to: { path: `${FEATURES}$1/ui/(public|client|coach)/` },
    },
    {
      name: "root-registry-to-server",
      comment:
        "The registry imports only the platform route fragment from composition-root/.",
      severity: "error",
      from: { path: "^apps/platform/src/routes\\.ts$" },
      to: {
        path: "^apps/platform/src/composition-root/",
        pathNot: "^apps/platform/src/composition-root/api/routes\\.ts$",
      },
    },
    {
      name: "root-registry",
      comment:
        "F78: nothing imports routes.ts or the root modules except root.tsx and the registry itself.",
      severity: "error",
      from: { path: APP, pathNot: ["^apps/platform/src/root\\.tsx$"] },
      to: {
        path: "^apps/platform/src/(routes\\.ts|root\\.tsx|root\\.server\\.ts|root-error-page\\.tsx)$",
      },
    },
    {
      name: "browser-half",
      comment:
        "R6: a feature's ui/** never imports its adapters/, data/, api/ or email/ folders and reaches server/ only through guards/; a registered page's loader reads its feature key there, and the .server suffix keeps that key out of the client build.",
      severity: "error",
      from: { path: `${FEATURES}${COMPONENT}/ui/` },
      to: {
        path: `${FEATURES}${COMPONENT}/(adapters/|data/|api/|email/|server/(?!guards/))`,
      },
    },
    {
      name: "design-system-browser-only",
      comment:
        "A feature's public/ is read by its server half, and a .server module never reaches a browser: neither imports the design system.",
      severity: "error",
      from: {
        path: [`${FEATURES}${COMPONENT}/public/`, "\\.server\\.tsx?$"],
      },
      to: { path: "^apps/platform/src/shared/design-system/" },
    },
    {
      name: "route-thinness",
      comment:
        "A registered route module never imports adapters/, data/, email/, a controller, shared/database or composition-root/ outside guards/.",
      severity: "error",
      from: { path: ROUTE_MODULES },
      to: {
        path: [
          `${FEATURES}${COMPONENT}/(adapters|data|email)/`,
          "-controller\\.server\\.ts$",
          "^apps/platform/src/shared/database/",
          "^apps/platform/src/shared/(email|images|documents|private-files|tokens|submission-checks/bot-detection)/",
          "^apps/platform/src/composition-root/(?!guards/)",
          `${FEATURES}${COMPONENT}/server/(?!guards/)`,
        ],
        dependencyTypesNot: ["type-only"],
      },
    },
    {
      name: "route-thinness-domain",
      comment:
        "A registered route module or its .server half never names a domain subpath, not even as a type.",
      severity: "error",
      from: { path: ROUTE_MODULES },
      to: { path: "^packages/domain/" },
    },
    {
      name: "domain-slices",
      comment: "Domain slices import each other only through the slice entry.",
      severity: "error",
      from: { path: "^packages/domain/src/([^/]+)/" },
      to: {
        path: "^packages/domain/src/(?!$1/)[^/]+/",
        pathNot: "^packages/domain/src/[^/]+/index\\.ts$",
      },
    },
    ...DOMAIN_SLICE_ORDER.map(domainSliceOrderRule),
    {
      name: "domain-no-externals",
      comment: "The domain package imports nothing outside itself.",
      severity: "error",
      from: { path: "^packages/domain/src/" },
      to: { dependencyTypesNot: ["local", "type-only"] },
    },
    {
      name: "shared-concerns",
      comment:
        "A shared concern never imports a bounded context or the composition root.",
      severity: "error",
      from: { path: "^apps/platform/src/shared/" },
      to: { path: "^apps/platform/src/(bounded-contexts|composition-root)/" },
    },
    {
      name: "shared-browser-entries",
      comment:
        "A non-.server module in shared/ never imports a .server module.",
      severity: "error",
      from: { path: "^apps/platform/src/shared/.*(?<!\\.server)\\.tsx?$" },
      to: { path: "^apps/platform/src/shared/.*\\.server\\.tsx?$" },
    },
    {
      name: "workspace-by-name-app",
      comment:
        "No relative path crosses the boundary from an app into a package.",
      severity: "error",
      from: { path: "^apps/" },
      to: { path: "^packages/", dependencyTypes: ["local"] },
    },
    {
      name: "workspace-by-name-packages",
      comment:
        "No relative path crosses the boundary from one package into another.",
      severity: "error",
      from: { path: "^packages/([^/]+)/" },
      to: { path: "^packages/(?!$1/)", dependencyTypes: ["local"] },
    },
    {
      name: "ui-subpaths",
      comment: "The design system's concern subpaths never import each other.",
      severity: "error",
      from: { path: "^apps/platform/src/shared/design-system/([^/]+)/" },
      to: {
        path: "^apps/platform/src/shared/design-system/(?!$1/)[^/]+/",
        pathNot: [
          "^apps/platform/src/shared/design-system/lib/",
          "^apps/platform/src/shared/design-system/primitives/",
        ],
      },
    },
    {
      name: "ui-primitives-import-only-lib",
      comment: "A primitive imports only lib/, never another subpath.",
      severity: "error",
      from: { path: "^apps/platform/src/shared/design-system/primitives/" },
      to: {
        path: "^apps/platform/src/shared/design-system/(?!primitives/|lib/)",
      },
    },
    {
      name: "ui-lib-is-the-base",
      comment: "lib/ imports nothing else in the design system.",
      severity: "error",
      from: { path: "^apps/platform/src/shared/design-system/lib/" },
      to: { path: "^apps/platform/src/shared/design-system/(?!lib/)" },
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true, pathNot: "\\?raw$" },
    },
    {
      name: "no-non-package-json",
      comment:
        "Every npm dependency is declared in the importing package's package.json.",
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
        pathNot: [
          "^apps/platform/src/routes\\.ts$",
          "/routes\\.ts$",
          "\\.config\\.[cm]?[jt]s$",
        ],
      },
      to: {
        dependencyTypes: ["npm-dev"],
        dependencyTypesNot: ["type-only", "npm-peer"],
      },
    },
    {
      name: "no-production-import-of-tests",
      comment:
        "R34: production code never imports a test rig or a test fixture (test files themselves are excluded from the cruise).",
      severity: "error",
      from: { path: "^(apps|packages)/" },
      to: {
        path: [
          "/integration-test-config/",
          "/e2e/",
          "/test-support/",
          "^apps/platform/test-support/",
        ],
      },
    },
    {
      name: "stability",
      comment:
        "R31: a package-to-package edge never points at a more unstable package.",
      severity: "error",
      from: { path: "^packages/([^/]+)/" },
      to: { path: "^packages/(?!$1/)[^/]+/", moreUnstable: true },
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
          "^apps/platform/src/composition-root/test-support/request-args\\.ts$",
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
    exclude: {
      path: [
        TESTS,
        "^apps/platform/src/.*\\.integration\\.test\\.",
        "^(?!node_modules/).*\\.d\\.ts$",
      ],
    },
    tsPreCompilationDeps: "specify",
    tsConfig: {
      fileName: path.resolve(__dirname, "dependency-cruiser.tsconfig.json"),
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
