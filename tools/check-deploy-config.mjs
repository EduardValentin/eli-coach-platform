import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP_NAME = "eli-coach-platform";
const SHELLCHECK_IMAGE =
  "koalaman/shellcheck@sha256:2097951f02e735b613f4a34de20c40f937a6c8f18ecb170612c88c34517221fb";
const SCRIPTS = [
  "scripts/deploy/deploy.sh",
  "scripts/deploy/run_migrations.sh",
];
const SAMPLE_EDGE_HOSTNAME = "app.example.com";
const SAMPLE_STACK_COLOR = "blue";
const LOG_OPTIONS = { "max-size": "10m", "max-file": "5" };
const FORBIDDEN_SERVICE_KEYS = [
  "ports",
  "privileged",
  "pid",
  "cap_add",
  "devices",
  "security_opt",
  "network_mode",
];
const SERVICES_BY_ENV = {
  test: {
    application: ["design-reference", "platform"],
    infrastructure: ["postgres", "stripe-webhook-relay"],
  },
  prod: { application: ["platform"], infrastructure: ["postgres"] },
};
const RUNTIME_ENVIRONMENT_BY_ENV = { test: "test", prod: "production" };
// Compose lets the caller's shell variables override --env-file, so none are passed.
const COMPOSE_PROCESS_ENVIRONMENT = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
};

function deployEnvFilePath(deployEnv) {
  return `deploy/env/${deployEnv}.env`;
}

function readDeploySettings(deployEnv) {
  const lines = readFileSync(deployEnvFilePath(deployEnv), "utf8")
    .split("\n")
    .filter((line) => line.includes("="));

  return Object.fromEntries(
    lines.map((line) => [
      line.slice(0, line.indexOf("=")),
      line.slice(line.indexOf("=") + 1),
    ]),
  );
}

function writeSampleComposeEnvironment(deployEnv, directory) {
  const appEnvFile = join(directory, "app.env");
  const postgresEnvFile = join(directory, "postgres.env");
  const composeEnvFile = join(directory, `${deployEnv}.compose.env`);
  writeFileSync(appEnvFile, "");
  writeFileSync(postgresEnvFile, "");
  writeFileSync(
    composeEnvFile,
    [
      readFileSync(deployEnvFilePath(deployEnv), "utf8"),
      `APP_ENV_FILE=${appEnvFile}`,
      `POSTGRES_ENV_FILE=${postgresEnvFile}`,
      `STACK_COLOR=${SAMPLE_STACK_COLOR}`,
      `HOST_LABEL=${SAMPLE_EDGE_HOSTNAME}`,
      "PLATFORM_IMAGE=registry.example.com/platform@sha256:0",
      "MIGRATION_IMAGE=registry.example.com/migrations@sha256:0",
      "DESIGN_REFERENCE_IMAGE=registry.example.com/design-reference@sha256:0",
      "POSTGRES_RUNTIME_IMAGE=registry.example.com/postgres@sha256:0",
      "STORE_ASSET_ROOT_HOST=/srv/store-assets/sample",
      "CLIENT_MEDIA_ROOT_HOST=/srv/client-media/sample",
      "CLIENT_RESOURCE_ROOT_HOST=/srv/client-resources/sample",
      "EXERCISE_VIDEO_ROOT_HOST=/srv/exercise-videos/sample",
      "RECIPE_PHOTO_ROOT_HOST=/srv/recipe-photos/sample",
      "",
    ].join("\n"),
  );

  return composeEnvFile;
}

function renderComposeConfig({ deployEnv, stack, composeEnvFile }) {
  try {
    return JSON.parse(composeConfigJson({ deployEnv, stack, composeEnvFile }));
  } catch (error) {
    throw new Error(
      `${deployEnv} ${stack}: docker compose config failed: ${error.stderr ?? error.message}`,
    );
  }
}

function composeConfigJson({ deployEnv, stack, composeEnvFile }) {
  return execFileSync(
    "docker",
    [
      "compose",
      "--env-file",
      composeEnvFile,
      "--profile",
      deployEnv,
      "-p",
      "deploy-config-check",
      "-f",
      `deploy/docker-compose.${stack}.yml`,
      "config",
      "--format",
      "json",
    ],
    { encoding: "utf8", env: COMPOSE_PROCESS_ENVIRONMENT, stdio: "pipe" },
  );
}

function logCapProblems(where, logging = {}) {
  const driverProblems =
    logging.driver === "json-file"
      ? []
      : [`${where}: log driver is ${logging.driver}, expected json-file`];
  const optionProblems = Object.entries(LOG_OPTIONS)
    .filter(([option, value]) => logging.options?.[option] !== value)
    .map(
      ([option, value]) =>
        `${where}: log option ${option} is ${logging.options?.[option]}, expected ${value}`,
    );

  return [...driverProblems, ...optionProblems];
}

function serviceProblems({ deployEnv, stack, name, service }) {
  const where = `${deployEnv} ${stack} ${name}`;
  const problems = [...logCapProblems(where, service.logging)];

  for (const key of FORBIDDEN_SERVICE_KEYS.filter((key) => key in service)) {
    problems.push(`${where}: sets ${key}`);
  }
  if (name !== "postgres" && service.labels?.logging !== "promtail") {
    problems.push(`${where}: lost the logging=promtail label`);
  }
  if (name !== "postgres" && service.labels?.env !== deployEnv) {
    problems.push(
      `${where}: env label is ${service.labels?.env}, expected ${deployEnv}`,
    );
  }
  if (!service.container_name?.startsWith(`${APP_NAME}-${deployEnv}-`)) {
    problems.push(
      `${where}: container name ${service.container_name} is not ${APP_NAME}-${deployEnv}-*`,
    );
  }
  if (name === "postgres" && "edge" in (service.networks ?? {})) {
    problems.push(`${where}: is attached to the edge network`);
  }

  return problems;
}

function stackProblems({ deployEnv, stack, config }) {
  const names = Object.keys(config.services).sort();
  const expectedNames = SERVICES_BY_ENV[deployEnv][stack];
  const setProblems =
    names.join() === expectedNames.join()
      ? []
      : [
          `${deployEnv} ${stack} services are [${names}], expected [${expectedNames}]`,
        ];
  const internalNetworkProblems =
    config.networks?.internal?.name === `${APP_NAME}-${deployEnv}-internal`
      ? []
      : [
          `${deployEnv} ${stack} internal network is ${config.networks?.internal?.name}`,
        ];

  return [
    ...setProblems,
    ...internalNetworkProblems,
    ...Object.entries(config.services).flatMap(([name, service]) =>
      serviceProblems({ deployEnv, stack, name, service }),
    ),
  ];
}

function platformProblems({ deployEnv, settings, application }) {
  const platform = application.services.platform;
  const problems = [];

  if (
    platform.container_name !==
    `${APP_NAME}-${deployEnv}-platform-${SAMPLE_STACK_COLOR}`
  ) {
    problems.push(
      `${deployEnv} platform container name is ${platform.container_name}`,
    );
  }
  if (
    platform.environment.ENVIRONMENT !== RUNTIME_ENVIRONMENT_BY_ENV[deployEnv]
  ) {
    problems.push(
      `${deployEnv} platform ENVIRONMENT is ${platform.environment.ENVIRONMENT}`,
    );
  }
  if (platform.environment.APP_BASE_PATH !== settings.APP_BASE_PATH) {
    problems.push(
      `${deployEnv} platform APP_BASE_PATH is ${platform.environment.APP_BASE_PATH}`,
    );
  }

  return problems;
}

function stripeRelayProblems({ settings, infrastructure }) {
  const forwardTo = `--forward-to http://platform:3000${settings.APP_BASE_PATH}/api/stripe/webhooks`;
  const command = infrastructure.services["stripe-webhook-relay"].command;

  return command.join(" ").includes(forwardTo)
    ? []
    : [`test stripe relay does not ${forwardTo}`];
}

function composeProblemsForEnv(deployEnv, directory) {
  try {
    return renderedComposeProblems(deployEnv, directory);
  } catch (error) {
    return [error.message];
  }
}

function renderedComposeProblems(deployEnv, directory) {
  const composeEnvFile = writeSampleComposeEnvironment(deployEnv, directory);
  const settings = readDeploySettings(deployEnv);
  const application = renderComposeConfig({
    deployEnv,
    stack: "application",
    composeEnvFile,
  });
  const infrastructure = renderComposeConfig({
    deployEnv,
    stack: "infrastructure",
    composeEnvFile,
  });
  const relayProblems =
    deployEnv === "test"
      ? stripeRelayProblems({ settings, infrastructure })
      : [];

  return [
    ...stackProblems({ deployEnv, stack: "application", config: application }),
    ...stackProblems({
      deployEnv,
      stack: "infrastructure",
      config: infrastructure,
    }),
    ...platformProblems({ deployEnv, settings, application }),
    ...relayProblems,
  ];
}

function renderTraefikTemplate(deployEnv) {
  const { APP_BASE_PATH } = readDeploySettings(deployEnv);

  return readFileSync(`deploy/traefik/${deployEnv}.yml.template`, "utf8")
    .replaceAll("__EDGE_HOSTNAME__", SAMPLE_EDGE_HOSTNAME)
    .replaceAll("__STACK_COLOR__", SAMPLE_STACK_COLOR)
    .replaceAll("__APP_BASE_PATH__", APP_BASE_PATH);
}

function yamlBlockUnder(text, key) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === `${key}:`);

  if (start === -1) {
    return "";
  }

  const indent = lines[start].search(/\S/);
  const end = lines.findIndex(
    (line, index) =>
      index > start && line.trim() !== "" && line.search(/\S/) <= indent,
  );

  return lines.slice(start, end === -1 ? undefined : end).join("\n");
}

function missingFromBlock({ rendered, key, expectedLines }) {
  const block = yamlBlockUnder(rendered, key);

  if (block === "") {
    return [`traefik: missing ${key}`];
  }

  return expectedLines
    .filter((expected) => !block.includes(expected))
    .map((expected) => `traefik: ${key} lacks ${expected}`);
}

function missingText({ rendered, expected }) {
  return rendered.includes(expected) ? [] : [`traefik: missing ${expected}`];
}

function keysUnder(text, key) {
  const [, ...children] = yamlBlockUnder(text, key).split("\n");
  const indent = children.find((line) => line.trim() !== "")?.search(/\S/);

  return children
    .filter((line) => line.search(/\S/) === indent && line.trim().endsWith(":"))
    .map((line) => line.trim().slice(0, -1));
}

function keySetProblems({ rendered, section, expected }) {
  const found = keysUnder(rendered, section).sort();

  return found.join() === [...expected].sort().join()
    ? []
    : [`traefik: ${section} are [${found}], expected [${expected}]`];
}

function testTraefikProblems(rendered) {
  const host = `Host(\`${SAMPLE_EDGE_HOSTNAME}\`)`;

  return [
    ...missingFromBlock({
      rendered,
      key: `${APP_NAME}-test-platform`,
      expectedLines: [`${host} && PathPrefix(\`/${APP_NAME}\`)`],
    }),
    ...missingFromBlock({
      rendered,
      key: `${APP_NAME}-test-design-reference`,
      expectedLines: [
        `${host} && PathPrefix(\`/${APP_NAME}/design-reference\`)`,
      ],
    }),
    ...["platform", "design-reference"].flatMap((service) =>
      missingText({
        rendered,
        expected: `url: http://${APP_NAME}-test-${service}-${SAMPLE_STACK_COLOR}:3000`,
      }),
    ),
  ];
}

function prodTraefikProblems(rendered) {
  const platformRouter = `${APP_NAME}-prod-platform`;

  return [
    ...keySetProblems({
      rendered,
      section: "routers",
      expected: [
        platformRouter,
        `${platformRouter}-www`,
        `${platformRouter}-http`,
      ],
    }),
    ...keySetProblems({
      rendered,
      section: "services",
      expected: [platformRouter],
    }),
    ...missingFromBlock({
      rendered,
      key: platformRouter,
      expectedLines: [
        `rule: Host(\`${SAMPLE_EDGE_HOSTNAME}\`)`,
        "- websecure",
        "certResolver: letsencrypt",
        "- secure-headers@file",
        `service: ${platformRouter}`,
      ],
    }),
    ...missingFromBlock({
      rendered,
      key: `${platformRouter}-www`,
      expectedLines: [
        `rule: Host(\`www.${SAMPLE_EDGE_HOSTNAME}\`)`,
        "- websecure",
        "certResolver: letsencrypt",
        `- ${APP_NAME}-prod-www-to-apex`,
      ],
    }),
    ...missingFromBlock({
      rendered,
      key: `${APP_NAME}-prod-www-to-apex`,
      expectedLines: [
        "regex: ^https://www\\.([^/]+)(.*)",
        "replacement: https://${1}${2}",
        "permanent: true",
      ],
    }),
    ...missingFromBlock({
      rendered,
      key: `${platformRouter}-http`,
      expectedLines: ["- web", "- redirect-to-https@file"],
    }),
    ...missingText({
      rendered,
      expected: `url: http://${platformRouter}-${SAMPLE_STACK_COLOR}:3000`,
    }),
    ...(yamlBlockUnder(rendered, `${platformRouter}-http`).includes("tls")
      ? [`traefik: ${platformRouter}-http must not terminate TLS`]
      : []),
    ...(rendered.includes("PathPrefix")
      ? ["traefik: PROD routes a path prefix; only the host may be routed"]
      : []),
  ];
}

function traefikProblemsForEnv(deployEnv) {
  const rendered = renderTraefikTemplate(deployEnv);
  const placeholderProblems = rendered.includes("__")
    ? [`traefik: ${deployEnv} template keeps an unfilled placeholder`]
    : [];
  const findEnvTraefikProblems =
    deployEnv === "test" ? testTraefikProblems : prodTraefikProblems;

  return [...placeholderProblems, ...findEnvTraefikProblems(rendered)];
}

function scriptProblems() {
  const problems = [];

  for (const script of SCRIPTS) {
    try {
      execFileSync("bash", ["-n", script], { stdio: "pipe" });
    } catch (error) {
      problems.push(`${script}: bash -n failed: ${error.stderr}`);
    }
  }

  try {
    execFileSync(
      "docker",
      [
        "run",
        "--rm",
        "--network",
        "none",
        "-v",
        `${process.cwd()}:/mnt:ro`,
        "-w",
        "/mnt",
        SHELLCHECK_IMAGE,
        ...SCRIPTS,
      ],
      { stdio: "pipe", encoding: "utf8" },
    );
  } catch (error) {
    problems.push(`shellcheck failed:\n${error.stdout}${error.stderr}`);
  }

  return problems;
}

function main() {
  const directory = mkdtempSync(join(tmpdir(), "deploy-config-"));

  try {
    const problems = [
      ...["test", "prod"].flatMap((deployEnv) => [
        ...composeProblemsForEnv(deployEnv, directory),
        ...traefikProblemsForEnv(deployEnv),
      ]),
      ...scriptProblems(),
    ];

    if (problems.length > 0) {
      console.error(
        `The deploy files are inconsistent:\n  ${problems.join("\n  ")}`,
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      "The TEST and PROD deploy files render, name containers consistently, cap logs, route only the app and pass shellcheck.",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

main();
