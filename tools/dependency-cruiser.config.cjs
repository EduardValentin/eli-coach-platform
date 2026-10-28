const { readdirSync } = require("node:fs");
const path = require("node:path");

const TESTS = "\\.(test|integration\\.test)\\.[cm]?[jt]sx?$";
const APP = "^apps/platform/src/";
const BOUNDED_CONTEXTS_ROOT = "^apps/platform/src/bounded-contexts/";
const FEATURES = `${BOUNDED_CONTEXTS_ROOT}[^/]+/`;
const COMPONENT = "(?!public/)[^/]+";
const BOUNDED_CONTEXT_PUBLIC = `${FEATURES}public/`;
const PUBLISHED_FOLDERS = `${FEATURES}(public|${COMPONENT}/ui/shared)/`;
const SURFACES = "^apps/platform/src/surfaces/";
const CONCEPT = "{concept}";

function flatOrInConceptFolder(patterns) {
  return patterns.flatMap((pattern) =>
    pattern.includes(CONCEPT)
      ? [pattern.replace(CONCEPT, ""), pattern.replace(CONCEPT, "[^/]+/")]
      : [pattern],
  );
}

const SCHEMA_FILE = "adapters/outbound/persistence/schema\\.server\\.ts$";
const FEATURE_SCHEMA = `${FEATURES}${COMPONENT}/${SCHEMA_FILE}`;
const REQUEST_KEYS = "adapters/inbound/http/[a-z-]*context\\.server\\.ts$";
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

const BOUNDED_CONTEXT_ORDER = [
  "operations",
  "legal",
  "access",
  "scheduling",
  "clients",
  "programs",
  "sales",
];

const COMPONENT_ORDER = {
  operations: ["feature-flags"],
  legal: ["legal"],
  access: ["accounts"],
  scheduling: ["coach-schedule", "assessment-calls"],
  clients: [
    "clients",
    "client-profile",
    "client-resources",
    "notifications",
    "check-ins",
  ],
  programs: ["exercise-library", "nutrition-library"],
  sales: ["store", "waitlist", "coaching-sales"],
};

const COMBINED_ORDER = BOUNDED_CONTEXT_ORDER.flatMap((boundedContext) =>
  COMPONENT_ORDER[boundedContext].map((component) => ({
    boundedContext,
    component,
  })),
);

function foldersOf(directory) {
  return readdirSync(path.join(__dirname, "..", directory), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function requireEveryFolderOrdered(directory) {
  const unordered = foldersOf(directory).flatMap((boundedContext) => {
    if (!BOUNDED_CONTEXT_ORDER.includes(boundedContext)) {
      return [`${boundedContext} (not in BOUNDED_CONTEXT_ORDER)`];
    }
    return foldersOf(path.join(directory, boundedContext))
      .filter((folder) => folder !== "public")
      .filter(
        (component) => !COMPONENT_ORDER[boundedContext].includes(component),
      )
      .map(
        (component) =>
          `${boundedContext}/${component} (not in COMPONENT_ORDER.${boundedContext})`,
      );
  });

  if (unordered.length > 0) {
    throw new Error(
      `Place every bounded context of ${directory} in BOUNDED_CONTEXT_ORDER and every component in its COMPONENT_ORDER entry; missing: ${unordered.join(", ")}.`,
    );
  }
}

requireEveryFolderOrdered("apps/platform/src/bounded-contexts");

function boundedContextOrderRule(boundedContext, position) {
  const earlier = BOUNDED_CONTEXT_ORDER.slice(0, position);

  return {
    name: `bounded-context-order-${boundedContext}`,
    comment: `A bounded context imports only the bounded contexts before it in BOUNDED_CONTEXT_ORDER, and of those only their published folders (the bounded context's public/ and each component's ui/shared/): ${boundedContext} may reach ${earlier.join(", ") || "no other bounded context"}. Schema files are held by schema-foreign-keys-point-at-providers instead.`,
    severity: "error",
    from: {
      path: `${BOUNDED_CONTEXTS_ROOT}${boundedContext}/`,
      pathNot: FEATURE_SCHEMA,
    },
    to: {
      path: `${BOUNDED_CONTEXTS_ROOT}(?!${boundedContext}/)[^/]+/`,
      ...(earlier.length > 0 && {
        pathNot: `${BOUNDED_CONTEXTS_ROOT}(${earlier.join("|")})/(public|${COMPONENT}/ui/shared)/`,
      }),
    },
  };
}

function componentOrderRule({ boundedContext, component }) {
  const components = COMPONENT_ORDER[boundedContext];
  const earlierAndOwn = components.slice(0, components.indexOf(component) + 1);

  return {
    name: `component-order-${component}`,
    comment: `Inside ${boundedContext}, a component imports only the components before it in COMPONENT_ORDER.${boundedContext}: ${component} may reach ${earlierAndOwn.slice(0, -1).join(", ") || "no sibling"}. Schema files are held by schema-foreign-keys-point-at-providers instead.`,
    severity: "error",
    from: {
      path: `${BOUNDED_CONTEXTS_ROOT}${boundedContext}/${component}/`,
      pathNot: FEATURE_SCHEMA,
    },
    to: {
      path: `${BOUNDED_CONTEXTS_ROOT}${boundedContext}/(?!(${earlierAndOwn.join("|")})/)${COMPONENT}/`,
    },
  };
}

function schemaForeignKeyRule({ boundedContext, component }, position) {
  const providers = COMBINED_ORDER.slice(0, position).map(
    (earlier) => earlier.component,
  );

  return {
    name: "schema-foreign-keys-point-at-providers",
    comment:
      "A component's adapters/outbound/persistence/schema.server.ts imports nothing of any bounded context outside its own component except, for a foreign key, consumer to provider, the schema.server.ts of a component earlier in BOUNDED_CONTEXT_ORDER, then COMPONENT_ORDER.",
    severity: "error",
    from: {
      path: `${FEATURES}${component}/${SCHEMA_FILE}`,
    },
    to: {
      path: `${BOUNDED_CONTEXTS_ROOT}(?!${boundedContext}/${component}/)`,
      ...(providers.length > 0 && {
        pathNot: `${FEATURES}(${providers.join("|")})/${SCHEMA_FILE}`,
      }),
    },
  };
}

function surfaceToFeatureRule(surface, slice) {
  return {
    name: `surface-${surface}-to-feature`,
    comment: `R2: surfaces/${surface} reaches a bounded context only through a component's ui/${slice}/, ui/shared/ and public/, the bounded context's public/ (request-context keys included) and routes.ts.`,
    severity: "error",
    from: { path: `${SURFACES}${surface}/` },
    to: {
      path: FEATURES,
      pathNot: [
        `${FEATURES}${COMPONENT}/ui/(${slice}|shared)/`,
        `${FEATURES}${COMPONENT}/public/`,
        BOUNDED_CONTEXT_PUBLIC,
        `${FEATURES}routes\\.ts$`,
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
    ...BOUNDED_CONTEXT_ORDER.map(boundedContextOrderRule),
    ...COMBINED_ORDER.map(componentOrderRule),
    ...COMBINED_ORDER.map(schemaForeignKeyRule),
    {
      name: "sibling-imports-published-only",
      comment:
        "Inside a bounded context, a component reaches a sibling only through the sibling's public/ and ui/shared/. Schema files are held by schema-foreign-keys-point-at-providers instead.",
      severity: "error",
      from: {
        path: `${BOUNDED_CONTEXTS_ROOT}([^/]+)/(${COMPONENT})/`,
        pathNot: FEATURE_SCHEMA,
      },
      to: {
        path: `${BOUNDED_CONTEXTS_ROOT}$1/(?!$2/)${COMPONENT}/`,
        pathNot: `${BOUNDED_CONTEXTS_ROOT}$1/${COMPONENT}/(public|ui/shared)/`,
      },
    },
    {
      name: "outbound-provider-adapter-only-importer",
      comment:
        "Across bounded contexts, only a component's adapters/outbound/<provider>/ imports the provider, and only the provider's bounded-context public/. A component's public/, adapters/outbound/email/, routes.ts and config.server.ts are held by component-roots-read-provider-paths, its composition.server.ts by component-composition-reads-provider-public, ui/ by ui-reads-published-only, adapters/inbound/http/ by inbound-reads-request-keys-only-from-public and schema files by schema-foreign-keys-point-at-providers.",
      severity: "error",
      from: {
        path: `${BOUNDED_CONTEXTS_ROOT}([^/]+)/${COMPONENT}/(?:adapters/outbound/)?([^/]+)/`,
        pathNot: [
          `${FEATURES}${COMPONENT}/(ui|public|adapters/inbound/http|adapters/outbound/email)/`,
          FEATURE_SCHEMA,
        ],
      },
      to: {
        path: `${BOUNDED_CONTEXTS_ROOT}(?!$1/)[^/]+/`,
        pathNot: `${BOUNDED_CONTEXTS_ROOT}$2/public/`,
      },
    },
    {
      name: "component-roots-read-provider-paths",
      comment:
        "A component's public/, adapters/outbound/email/, routes.ts and config.server.ts read another bounded context only through its public/paths.ts: a route path is published data and an email links to a portal page. The admitted files are named; no bounded-context public/ holds a DTO-only module today, and one is added here by name when it appears. Never a facade interface, a foreign component's public/ or ui/, an adapter or a domain.",
      severity: "error",
      from: {
        path: `${BOUNDED_CONTEXTS_ROOT}([^/]+)/${COMPONENT}/((public|adapters/outbound/email)/|config\\.server\\.ts$|routes\\.ts$)`,
      },
      to: {
        path: `${BOUNDED_CONTEXTS_ROOT}(?!$1/)[^/]+/`,
        pathNot: `${BOUNDED_CONTEXT_PUBLIC}paths\\.ts$`,
      },
    },
    {
      name: "component-composition-reads-provider-public",
      comment:
        "A component's composition.server.ts reads another bounded context only through its bounded-context public/: the facade interfaces it types and hands to its adapters, and route paths. Never a foreign component's public/ or ui/, an adapter or a domain.",
      severity: "error",
      from: {
        path: `${BOUNDED_CONTEXTS_ROOT}([^/]+)/${COMPONENT}/composition\\.server\\.ts$`,
      },
      to: {
        path: `${BOUNDED_CONTEXTS_ROOT}(?!$1/)[^/]+/`,
        pathNot: BOUNDED_CONTEXT_PUBLIC,
      },
    },
    {
      name: "ui-reads-published-only",
      comment:
        "A component's ui/ reaches another bounded context only through its published folders: the bounded context's public/ for paths and DTO types, and a component's ui/shared/ for widgets. Never a foreign component's public/, domain/, adapters/ or composition.",
      severity: "error",
      from: { path: `${BOUNDED_CONTEXTS_ROOT}([^/]+)/${COMPONENT}/ui/` },
      to: {
        path: `${BOUNDED_CONTEXTS_ROOT}(?!$1/)[^/]+/`,
        pathNot: PUBLISHED_FOLDERS,
      },
    },
    {
      name: "inbound-reads-request-keys-only-from-public",
      comment:
        "A component's adapters/inbound/http/ reaches another bounded context only through four files of that bounded context's public/: request-context.ts (keys), session.ts (the access session), portal-standing.ts (the client's standing) and paths.ts. Never a facade interface: a controller is never handed a provider facade, it calls its own use cases, which reach the provider through their own ports.",
      severity: "error",
      from: {
        path: `${BOUNDED_CONTEXTS_ROOT}([^/]+)/${COMPONENT}/adapters/inbound/http/`,
      },
      to: {
        path: `${BOUNDED_CONTEXTS_ROOT}(?!$1/)[^/]+/`,
        pathNot: `${BOUNDED_CONTEXT_PUBLIC}(request-context|session|portal-standing|paths)\\.ts$`,
      },
    },
    {
      name: "keys-construct-nothing",
      comment:
        "A request-context key file (adapters/inbound/http/*context.server.ts) creates a router context and nothing else: at runtime it imports only react-router; everything else it names is a type.",
      severity: "error",
      from: { path: `${FEATURES}${COMPONENT}/${REQUEST_KEYS}` },
      to: {
        pathNot: "(^|/)react-router(/|$)",
        dependencyTypesNot: ["type-only"],
      },
    },
    {
      name: "no-database-types-outside-persistence",
      comment:
        "Only adapters/outbound/persistence/, the bounded contexts' and components' composition.server.ts files, composition-root/ and shared/database/ name the database: no port, facade, use case or controller imports shared/database, drizzle-orm or pg.",
      severity: "error",
      from: {
        path: APP,
        pathNot: [
          `${FEATURES}${COMPONENT}/adapters/outbound/persistence/`,
          COMPONENT_COMPOSITION,
          BOUNDED_CONTEXT_COMPOSITION,
          COMPOSITION_ROOT,
          "^apps/platform/src/shared/database/",
        ],
      },
      to: {
        path: [
          "^apps/platform/src/shared/database/",
          "(^|/)drizzle-orm(/|$)",
          "(^|/)pg(/|$)",
        ],
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
      from: {
        path: APP,
        pathNot: [SURFACES, "^apps/platform/src/routes\\.ts$"],
      },
      to: { path: SURFACES },
    },
    {
      name: "composition-root",
      comment:
        "R5: nothing imports composition-root/** except root.server.ts, the registry (fragments only) and composition-root/ itself; a surface reads only the runtime-config key in composition-root/guards/runtime-config-context.server.ts.",
      severity: "error",
      from: {
        path: APP,
        pathNot: [
          "^apps/platform/src/root\\.server\\.ts$",
          COMPOSITION_ROOT,
          "^apps/platform/src/routes\\.ts$",
          FEATURES,
        ],
      },
      to: {
        path: COMPOSITION_ROOT,
        pathNot:
          "^apps/platform/src/composition-root/guards/runtime-config-context\\.server\\.ts$",
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
        "A component's request-context key in adapters/inbound/http/ is read by that component's adapters/inbound/http/ and ui/ and its composition (the feature type), where sibling-imports-published-only keeps other components out, by its bounded context's composition.server.ts, which sets it, and public/request-context.ts, which publishes it to the surfaces and the root, where bounded-context-root-own-components keeps other bounded contexts out.",
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
        "A bounded context's composition.server.ts is imported only by composition-root/container.server.ts.",
      severity: "error",
      from: {
        path: APP,
        pathNot: "^apps/platform/src/composition-root/container\\.server\\.ts$",
      },
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
      name: "composition-root-reaches-compositions-only",
      comment:
        "composition-root/ composes the bounded contexts and never adapts: of bounded-contexts/ it imports only a bounded context's composition.server.ts, routes.ts and public/ and a component's config.server.ts, whose shape it merges. Each component builds its own adapters in its composition.server.ts; the root hands in config values and shared implementations. The test-support/ rig builds request contexts for tests and is not held.",
      severity: "error",
      from: {
        path: COMPOSITION_ROOT,
        pathNot: `${COMPOSITION_ROOT}test-support/`,
      },
      to: {
        path: BOUNDED_CONTEXTS_ROOT,
        pathNot: [
          BOUNDED_CONTEXT_COMPOSITION,
          `${FEATURES}routes\\.ts$`,
          BOUNDED_CONTEXT_PUBLIC,
          `${FEATURES}${COMPONENT}/config\\.server\\.ts$`,
        ],
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
      to: { path: COMPOSITION_ROOT },
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
          "^apps/platform/e2e/",
          "^apps/platform/integration-test-config/",
          "^lighthouserc\\.cjs$",
        ],
      },
      to: { path: "(^|/)@clerk/" },
    },
    {
      name: "stripe-confined",
      comment:
        "Stripe stays behind the coaching-sales payments adapter: nothing else names stripe.",
      severity: "error",
      from: {
        pathNot: [
          `${FEATURES}coaching-sales/adapters/outbound/payments/stripe/`,
        ],
      },
      to: { path: "(^|node_modules/)stripe(/|$)" },
    },
    {
      name: "resend-confined",
      comment:
        "Email delivery stays behind the shared email concern: nothing else names resend.",
      severity: "error",
      from: { pathNot: ["^apps/platform/src/shared/email/"] },
      to: { path: "(^|node_modules/)resend(/|$)" },
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
        "A component's ui/shared/ serves every actor UI of that component, so it never imports the component's own ui/public/, ui/client/ or ui/coach/.",
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
        path: COMPOSITION_ROOT,
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
        "A component's or a bounded context's public/ is read by the server half, and a .server module never reaches a browser: none of them imports the design system.",
      severity: "error",
      from: {
        path: [
          `${FEATURES}${COMPONENT}/public/`,
          BOUNDED_CONTEXT_PUBLIC,
          "\\.server\\.tsx?$",
        ],
      },
      to: { path: "^apps/platform/src/shared/design-system/" },
    },
    {
      name: "route-thinness",
      comment:
        "A registered route module never imports adapters/outbound/, adapters/inbound/facades/, an inbound .server module other than a request-context key (controllers, the store's management-auth helpers), a composition, a config module, shared/database, a server-only shared concern or composition-root/ outside guards/.",
      severity: "error",
      from: { path: ROUTE_MODULES },
      to: {
        path: [
          `${FEATURES}${COMPONENT}/adapters/(outbound|inbound/facades)/`,
          `${FEATURES}${COMPONENT}/adapters/inbound/http/.*(?<!context)\\.server\\.tsx?$`,
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
      to: { path: `${FEATURES}${COMPONENT}/domain/` },
    },
    {
      name: "domain-imports-only-itself",
      comment:
        "A component's domain/ imports only its own domain/: no sibling's or other bounded context's domain/, no shared/, no other folder of its component, no package and no Node built-in, not even as a type.",
      severity: "error",
      from: {
        path: "^apps/platform/src/bounded-contexts/([^/]+)/([^/]+)/domain/",
      },
      to: {
        pathNot: "^apps/platform/src/bounded-contexts/$1/$2/domain/",
      },
    },
    {
      name: "bounded-context-public-imports-no-domain",
      comment:
        "A bounded context's public/ publishes DTO types, interfaces, request-context keys and route paths: it never imports a domain/, not even its own components' and not even as a type.",
      severity: "error",
      from: { path: BOUNDED_CONTEXT_PUBLIC },
      to: { path: "/domain/" },
    },
    {
      name: "bounded-context-public-publishes-keys-and-paths",
      comment:
        "A bounded context's public/ holds interfaces, DTO types, route paths and the request-context keys, and nothing else that runs: of a bounded context it imports only a bounded-context public/ (its own or an earlier one's), its own components' request-context keys (adapters/inbound/http/*context.server.ts) and their public/paths.ts. Never a component public/, which may re-export domain types, and never another bounded context's component.",
      severity: "error",
      from: { path: `${BOUNDED_CONTEXTS_ROOT}([^/]+)/public/` },
      to: {
        path: BOUNDED_CONTEXTS_ROOT,
        pathNot: [
          BOUNDED_CONTEXT_PUBLIC,
          `${BOUNDED_CONTEXTS_ROOT}$1/${COMPONENT}/public/paths\\.ts$`,
          `${BOUNDED_CONTEXTS_ROOT}$1/${COMPONENT}/${REQUEST_KEYS}`,
        ],
      },
    },
    {
      name: "component-public-reads-own-domain-only",
      comment:
        "A component's public/ publishes its domain types and browser-safe helpers over them: of its own component it imports only domain/ and public/, never adapters/, ui/, composition.server.ts or config.server.ts. Siblings are held by sibling-imports-published-only, other bounded contexts by component-roots-read-provider-paths.",
      severity: "error",
      from: { path: `${BOUNDED_CONTEXTS_ROOT}([^/]+)/(${COMPONENT})/public/` },
      to: {
        path: `${BOUNDED_CONTEXTS_ROOT}$1/$2/`,
        pathNot: `${BOUNDED_CONTEXTS_ROOT}$1/$2/(domain|public)/`,
      },
    },
    {
      name: "no-cross-context-domain-import",
      comment:
        "No entity leaves its bounded context: nothing in a bounded context imports another bounded context's domain/, not even as a type.",
      severity: "error",
      from: { path: "^apps/platform/src/bounded-contexts/([^/]+)/" },
      to: {
        path: "^apps/platform/src/bounded-contexts/(?!$1/)[^/]+/[^/]+/domain/",
      },
    },
    {
      name: "shared-imports-no-context",
      comment:
        "shared/ sits below every bounded context: a shared concern never imports a bounded context or the composition root.",
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
        path: ["/integration-test-config/", "/e2e/", "/test-support/"],
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
