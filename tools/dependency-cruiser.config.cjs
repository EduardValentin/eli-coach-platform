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

const FEATURE_PUBLIC_FOLDERS = "(public|ui/shared)/";
const FEATURE_SCHEMA = `${FEATURES}${COMPONENT}/adapters/outbound/persistence/schema\\.server\\.ts$`;
const REQUEST_KEYS = "adapters/inbound/http/[a-z-]*context\\.server\\.ts$";
// Temporary until Task 14 publishes the portal standing through clients' public/.
const CLIENT_PORTAL_STANDING_GUARD = `${FEATURES}clients/adapters/inbound/http/require-client-portal-standing\\.server\\.ts$`;
const COMPONENT_COMPOSITION = `${FEATURES}${COMPONENT}/composition\\.server\\.ts$`;
const BOUNDED_CONTEXT_COMPOSITION = `${FEATURES}composition\\.server\\.ts$`;
const BOUNDED_CONTEXT_REQUEST_CONTEXT = `${FEATURES}public/request-context\\.ts$`;
const COMPOSITION_ROOT = "^apps/platform/src/composition-root/";
const ROUTE_MODULES = flatOrInConceptFolder([
  `${FEATURES}${COMPONENT}/adapters/inbound/http/${CONCEPT}[^/]+(?<!\\.server)\\.ts$`,
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

// Temporary until Task 17: another component's domain/ is admitted by
// feature-internals, feature-schema-foreign-key, every feature-order-* rule and
// domain-imports-only-itself while the provider imports are replaced one at a
// time.
const FOREIGN_DOMAIN =
  "^apps/platform/src/bounded-contexts/[^/]+/[^/]+/domain/";

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

function featureOrderRule(feature, position) {
  const earlierFeatures = FEATURE_ORDER.slice(0, position);
  const admittedBoundedContexts = BOUNDED_CONTEXTS.slice(
    0,
    boundedContextPositionOf(feature) + 1,
  ).map(([boundedContext]) => boundedContext);

  return {
    name: `feature-order-${feature}`,
    comment: `A feature imports only the features before it in FEATURE_ORDER and the public/ of its own and earlier bounded contexts: ${feature} may import ${earlierFeatures.join(", ") || "no other feature"} and ${admittedBoundedContexts.join(", ")} public/, and, temporarily until Task 17, any component's domain/. Its adapters/outbound/persistence/schema.server.ts is held by feature-schema-foreign-key and feature-schema-imports-schemas-only instead.`,
    severity: "error",
    from: { path: `${FEATURES}${feature}/`, pathNot: FEATURE_SCHEMA },
    to: {
      path: FEATURES,
      pathNot: [
        `${FEATURES}(${[...earlierFeatures, feature].join("|")})/`,
        `^apps/platform/src/bounded-contexts/(${admittedBoundedContexts.join("|")})/public/`,
        FOREIGN_DOMAIN,
      ],
    },
  };
}

function surfaceToFeatureRule(surface, slice) {
  return {
    name: `surface-${surface}-to-feature`,
    comment: `R2: surfaces/${surface} reaches a bounded context only through a component's ui/${slice}/, ui/shared/ and public/, the bounded context's public/ (request-context keys included) and routes.ts, and, temporarily, the client portal standing guard until Task 14.`,
    severity: "error",
    from: { path: `${SURFACES}${surface}/` },
    to: {
      path: FEATURES,
      pathNot: [
        `${FEATURES}${COMPONENT}/ui/(${slice}|shared)/`,
        `${FEATURES}${COMPONENT}/public/`,
        BOUNDED_CONTEXT_PUBLIC,
        `${FEATURES}routes\\.ts$`,
        CLIENT_PORTAL_STANDING_GUARD,
      ],
    },
  };
}

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment: "R30: no dependency cycles, including between domain concepts.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "feature-internals",
      comment:
        "R3: a feature imports another feature only through public/ or ui/shared/ and, temporarily until Task 17, its domain/.",
      severity: "error",
      from: {
        path: `${FEATURES}(${COMPONENT})/`,
        pathNot: FEATURE_SCHEMA,
      },
      to: {
        path: `${FEATURES}(?!$1/)${COMPONENT}/`,
        pathNot: [
          `${FEATURES}${COMPONENT}/${FEATURE_PUBLIC_FOLDERS}`,
          FOREIGN_DOMAIN,
        ],
      },
    },
    {
      name: "feature-schema-foreign-key",
      comment:
        "R3 carve-out: adapters/outbound/persistence/schema.server.ts may import any feature's schema.server.ts for a foreign key, before or after it in FEATURE_ORDER, and, temporarily until Task 17, any component's domain/, and nothing else private.",
      severity: "error",
      from: {
        path: `${FEATURES}(${COMPONENT})/adapters/outbound/persistence/schema\\.server\\.ts$`,
      },
      to: {
        path: `${FEATURES}(?!$1/)${COMPONENT}/`,
        pathNot: [
          `${FEATURES}${COMPONENT}/${FEATURE_PUBLIC_FOLDERS}`,
          FEATURE_SCHEMA,
          FOREIGN_DOMAIN,
        ],
      },
    },
    {
      name: "feature-schema-imports-schemas-only",
      comment:
        "A schema file sits outside FEATURE_ORDER, so another feature's adapters/outbound/persistence/schema.server.ts is the only thing of that feature it imports: not even its public folders.",
      severity: "error",
      from: {
        path: `${FEATURES}(${COMPONENT})/adapters/outbound/persistence/schema\\.server\\.ts$`,
      },
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
        "The feature-flags composition is the only production importer of its adapters/outbound/overrides/: the override reader and middleware reach a request through that composition alone.",
      severity: "error",
      from: {
        path: APP,
        pathNot: [
          `${FEATURES}feature-flags/composition\\.server\\.ts$`,
          `${FEATURES}feature-flags/adapters/outbound/overrides/`,
        ],
      },
      to: {
        path: `${FEATURES}feature-flags/adapters/outbound/overrides/`,
      },
    },
    {
      name: "component-key-consumers",
      comment:
        "A component's request-context key in adapters/inbound/http/ is read by that component's adapters/inbound/http/ and ui/ and its composition (the feature type), where feature-internals keeps other components out, by its bounded context's composition.server.ts, which sets it, and public/request-context.ts, which publishes it to the surfaces and the root, where bounded-context-root-own-components keeps other bounded contexts out.",
      severity: "error",
      from: {
        path: APP,
        pathNot: [
          `${FEATURES}${COMPONENT}/(adapters/inbound/http|ui)/`,
          COMPONENT_COMPOSITION,
          BOUNDED_CONTEXT_COMPOSITION,
          BOUNDED_CONTEXT_REQUEST_CONTEXT,
        ],
      },
      to: { path: `${FEATURES}${COMPONENT}/${REQUEST_KEYS}` },
    },
    {
      name: "feature-server-private",
      comment:
        "Nothing in a component outside composition.server.ts imports its composition.server.ts: composition is reachable only from the composition root.",
      severity: "error",
      from: {
        path: `${FEATURES}(${COMPONENT})/(?!composition\\.server\\.ts$)`,
      },
      to: { path: `${FEATURES}$1/composition\\.server\\.ts$` },
    },
    {
      name: "composition-only-from-above",
      comment:
        "A component's composition.server.ts is imported only by a bounded context's composition.server.ts (its own, by bounded-context-root-own-components).",
      severity: "error",
      from: { path: APP, pathNot: BOUNDED_CONTEXT_COMPOSITION },
      to: { path: COMPONENT_COMPOSITION },
    },
    {
      name: "composition-only-from-above-bounded-context",
      comment:
        "A bounded context's composition.server.ts is imported only by composition-root/.",
      severity: "error",
      from: { path: APP, pathNot: COMPOSITION_ROOT },
      to: { path: BOUNDED_CONTEXT_COMPOSITION },
    },
    {
      name: "composition-only-from-above-container",
      comment:
        "composition-root/container.server.ts is imported only by root.server.ts and composition-root/.",
      severity: "error",
      from: {
        path: APP,
        pathNot: ["^apps/platform/src/root\\.server\\.ts$", COMPOSITION_ROOT],
      },
      to: {
        path: "^apps/platform/src/composition-root/container\\.server\\.ts$",
      },
    },
    {
      name: "bounded-context-root-own-components",
      comment:
        "A bounded context's root modules (composition.server.ts, routes.ts, public/) reach into their own bounded context's components only; another bounded context is reached through its public/.",
      severity: "error",
      from: {
        path: "^apps/platform/src/bounded-contexts/([^/]+)/(composition\\.server\\.ts$|routes\\.ts$|public/)",
      },
      to: {
        path: "^apps/platform/src/bounded-contexts/(?!$1/)[^/]+/(?!public/)[^/]+/",
      },
    },
    {
      name: "config-runtime-readers",
      comment:
        "Only the runtime reader, the container and database modules, the readyz controller, the migration config and the integration rig read the environment; everything else receives concern values and may import only their types.",
      severity: "error",
      from: {
        path: "^apps/",
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
      name: "clerk-confined",
      comment:
        "Clerk stays behind the accounts feature, the app root modules, the identity adapter and the test harnesses: nothing else names @clerk/*.",
      severity: "error",
      from: {
        pathNot: [
          `${FEATURES}accounts/`,
          "^apps/platform/src/(root\\.tsx|root\\.server\\.ts|root-error-page\\.tsx)$",
          `${FEATURES}clients/adapters/outbound/persistence/identity/`,
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
      name: "inbound-reads-request-keys-only-from-public",
      comment:
        "A component's adapters/inbound/http/ reaches another bounded context only through that bounded context's public/, where its request-context keys (the access session among them) are published, and, until Task 17 republishes them there, a component's public/. It says nothing about ui/.",
      severity: "error",
      from: {
        path: "^apps/platform/src/bounded-contexts/([^/]+)/[^/]+/adapters/inbound/http/",
      },
      to: {
        path: "^apps/platform/src/bounded-contexts/(?!$1/)[^/]+/",
        pathNot: [BOUNDED_CONTEXT_PUBLIC, `${FEATURES}${COMPONENT}/public/`],
      },
    },
    {
      name: "inbound-never-imports-outbound",
      comment:
        "An inbound adapter (controller, route, facade) never imports its component's persistence or email adapters; the composition hands them in through ports. A provider adapter's vocabulary under adapters/outbound/<provider>/ stays readable.",
      severity: "error",
      from: { path: `${FEATURES}${COMPONENT}/adapters/inbound/` },
      to: {
        path: `${FEATURES}${COMPONENT}/adapters/outbound/(persistence|email)/`,
      },
    },
    {
      name: "feature-api-never-imports-ui",
      comment:
        "A component's adapters/inbound/ never imports any component's ui/: what a route module's clientAction shares with the browser half lives in public/ or a shared browser entry.",
      severity: "error",
      from: { path: `${FEATURES}${COMPONENT}/adapters/inbound/` },
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
        "R6: a component's ui/** never imports its adapters/, composition.server.ts or config.server.ts, except its request-context keys in adapters/inbound/http/: a registered page's loader reads its component key there, and the .server suffix keeps that key out of the client build.",
      severity: "error",
      from: { path: `${FEATURES}${COMPONENT}/ui/` },
      to: {
        path: `${FEATURES}${COMPONENT}/(adapters/|(composition|config)\\.server\\.ts$)`,
        pathNot: `${FEATURES}${COMPONENT}/${REQUEST_KEYS}`,
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
        "A registered route module never imports adapters/outbound/, the store's management-auth helpers, a composition, a config module, a controller, shared/database or composition-root/ outside guards/.",
      severity: "error",
      from: { path: ROUTE_MODULES },
      to: {
        path: [
          `${FEATURES}${COMPONENT}/adapters/outbound/`,
          `${FEATURES}${COMPONENT}/adapters/inbound/http/management/management-auth/`,
          `${FEATURES}${COMPONENT}/(composition|config)\\.server\\.ts$`,
          "-controller\\.server\\.ts$",
          "^apps/platform/src/shared/database/",
          "^apps/platform/src/shared/(email|images|documents|private-files|tokens|submission-checks/bot-detection)/",
          "^apps/platform/src/composition-root/(?!guards/)",
        ],
        dependencyTypesNot: ["type-only"],
      },
    },
    {
      name: "route-thinness-domain",
      comment:
        "A registered route module or its .server half never names a component's domain/, not even as a type.",
      severity: "error",
      from: { path: ROUTE_MODULES },
      to: { path: "^apps/platform/src/bounded-contexts/[^/]+/[^/]+/domain/" },
    },
    {
      name: "domain-imports-only-itself",
      comment:
        "A component's domain/ imports only its own domain/: no shared/, no other folder of its component, no package and no Node built-in, not even as a type. Temporarily until Task 17 it may also import another component's domain/.",
      severity: "error",
      from: {
        path: "^apps/platform/src/bounded-contexts/([^/]+)/([^/]+)/domain/",
      },
      to: {
        pathNot: [
          "^apps/platform/src/bounded-contexts/$1/$2/domain/",
          FOREIGN_DOMAIN,
        ],
      },
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
        path: "^apps/",
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
      from: { path: "^apps/" },
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
