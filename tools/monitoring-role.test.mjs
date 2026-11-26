import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { Network } from "testcontainers";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "..");
const postgresImage = readFileSync(
  resolve(repositoryRoot, "docker/postgres-runtime-base-image.txt"),
  "utf8",
).trim();
const migrationScript = resolve(
  repositoryRoot,
  "scripts/deploy/run_migrations.sh",
);
const database = "eli_coach_platform";
const bootstrapUser = {
  name: "bootstrap_admin",
  password: "bootstrap-password",
};
const migrationUser = {
  name: "migration_role",
  password: "migration-password",
};
const monitoringUser = "monitoring_role";
const firstPassword = "firstmonitoringpassword";
const stubMigrationImage = "eli-monitoring-role-test-migrations:local";

let workDirectory;
let network;
let container;
let dockerShimDirectory;

function postgresEnvironmentContents({ monitoringKeys }) {
  return [
    `POSTGRES_DB=${database}`,
    `POSTGRES_USER=${bootstrapUser.name}`,
    `POSTGRES_PASSWORD=${bootstrapUser.password}`,
    "APP_DB_SCHEMA=app",
    "APP_DB_APP_USER=application_role",
    "APP_DB_APP_PASSWORD=application-password",
    `APP_DB_MIGRATION_USER=${migrationUser.name}`,
    `APP_DB_MIGRATION_PASSWORD=${migrationUser.password}`,
    ...(monitoringKeys ?? []),
    "",
  ].join("\n");
}

function postgresEnvironmentWithMonitoringRole({ user, password }) {
  return postgresEnvironmentContents({
    monitoringKeys: [
      `APP_DB_MONITORING_USER=${user}`,
      `APP_DB_MONITORING_PASSWORD=${password}`,
    ],
  });
}

function postgresEnvironmentWithMonitoringPassword(password) {
  return postgresEnvironmentWithMonitoringRole({
    user: monitoringUser,
    password,
  });
}

// The real deploy pulls the migration image from a registry; this stand-in
// carries only the SQL files and exits, so the script's own rendering and
// psql path runs against a real Postgres.
function buildStubMigrationImage() {
  writeFileSync(
    join(workDirectory, "Dockerfile"),
    ["FROM alpine:3.20", "COPY sql /workspace/sql", 'CMD ["true"]', ""].join(
      "\n",
    ),
  );
  execFileSync(
    "docker",
    [
      "build",
      "--quiet",
      "--tag",
      stubMigrationImage,
      "--file",
      join(workDirectory, "Dockerfile"),
      resolve(repositoryRoot, "apps/platform/db"),
    ],
    { stdio: "pipe" },
  );
}

function writeDockerPullShim() {
  const shimDirectory = join(workDirectory, "shim");
  dockerShimDirectory = shimDirectory;
  const realDocker = execFileSync("which", ["docker"], {
    encoding: "utf8",
  }).trim();
  execFileSync("mkdir", [shimDirectory]);
  writeFileSync(
    join(shimDirectory, "docker"),
    `#!/bin/sh\n[ "$1" = pull ] && exit 0\nexec "${realDocker}" "$@"\n`,
  );
  chmodSync(join(shimDirectory, "docker"), 0o755);
}

function runMigrationScript(postgresEnvironment) {
  const postgresEnvFile = join(workDirectory, "postgres.env");
  writeFileSync(postgresEnvFile, postgresEnvironment);

  try {
    execFileSync("bash", [migrationScript], {
      encoding: "utf8",
      stdio: "pipe",
      env: {
        PATH: `${dockerShimDirectory}:${process.env.PATH}`,
        HOME: process.env.HOME,
        DEPLOY_ENV: "test",
        MIGRATION_IMAGE: stubMigrationImage,
        POSTGRES_ENV_FILE: postgresEnvFile,
        APP_ENV_FILE: join(workDirectory, "absent-app.env"),
        POSTGRES_CONTAINER_NAME: containerName(),
        INTERNAL_NETWORK: network.getName(),
      },
    });

    return { exitCode: 0, output: "" };
  } catch (error) {
    return { exitCode: error.status, output: `${error.stdout}${error.stderr}` };
  }
}

function serverLog() {
  const logs = spawnSync("docker", ["logs", containerName()], {
    encoding: "utf8",
  });

  return `${logs.stdout}${logs.stderr}`;
}

function containerName() {
  return container.getName().replace(/^\//, "");
}

// Loopback connections are trusted by the image's pg_hba, so passwords are
// only checked on the network address, as the exporter connects.
async function psqlAs({ user, password, commands }) {
  const result = await container.exec(
    [
      "psql",
      `--host=${container.getIpAddress(network.getName())}`,
      `--username=${user}`,
      `--dbname=${database}`,
      "-tA",
      ...commands.flatMap((command) => ["-c", command]),
    ],
    { env: { PGPASSWORD: password } },
  );

  return { exitCode: result.exitCode, output: result.output.trim() };
}

function asMonitoringRole(password, ...commands) {
  return psqlAs({ user: monitoringUser, password, commands });
}

beforeAll(async () => {
  workDirectory = mkdtempSync(join(tmpdir(), "monitoring-role-"));
  network = await new Network().start();
  container = await new PostgreSqlContainer(postgresImage)
    .withDatabase(database)
    .withUsername(bootstrapUser.name)
    .withPassword(bootstrapUser.password)
    .withNetwork(network)
    .start();
  buildStubMigrationImage();
  writeDockerPullShim();

  const firstRun = runMigrationScript(
    postgresEnvironmentWithMonitoringPassword(firstPassword),
  );
  expect(firstRun.exitCode, firstRun.output).toBe(0);
  await psqlAs({
    user: migrationUser.name,
    password: migrationUser.password,
    commands: ["create table app.clients (id int)"],
  });
}, 180_000);

afterAll(async () => {
  await container?.stop();
  await network?.stop();
  rmSync(workDirectory, { recursive: true, force: true });
});

describe("monitoring role", () => {
  it("reads the server statistics the exporter collects", async () => {
    // arrange
    const password = firstPassword;

    // act
    const statistics = await asMonitoringRole(
      password,
      "select count(*) > 0 from pg_stat_database join pg_stat_activity on true",
    );

    // assert
    expect(statistics).toEqual({ exitCode: 0, output: "t" });
  });

  it("opens every session read-only", async () => {
    // arrange
    const password = firstPassword;

    // act
    const setting = await asMonitoringRole(
      password,
      "show default_transaction_read_only",
    );

    // assert
    expect(setting).toEqual({ exitCode: 0, output: "on" });
  });

  it.each([
    ["the public schema", "create table public.gen241_probe()"],
    ["the application schema", "create table app.gen241_probe()"],
  ])(
    "cannot create a table in %s even in a writable session",
    async (_schema, statement) => {
      // arrange
      const password = firstPassword;

      // act
      const attempt = await asMonitoringRole(
        password,
        "set default_transaction_read_only = off",
        statement,
      );

      // assert
      expect(attempt.exitCode).not.toBe(0);
      expect(attempt.output).toContain("permission denied");
    },
  );

  it("cannot read the application's data", async () => {
    // arrange
    const password = firstPassword;

    // act
    const attempt = await asMonitoringRole(
      password,
      "select * from app.clients",
    );

    // assert
    expect(attempt.exitCode).not.toBe(0);
    expect(attempt.output).toContain("permission denied for schema app");
  });

  it("limits how many connections it can hold", async () => {
    // arrange
    const password = firstPassword;

    // act
    const limit = await asMonitoringRole(
      password,
      "select rolconnlimit from pg_roles where rolname = current_user",
    );

    // assert
    expect(limit).toEqual({ exitCode: 0, output: "3" });
  });

  it(
    "takes a rotated password when the deploy runs again",
    { timeout: 180_000 },
    async () => {
      // arrange
      const rotatedPassword = "rotatedmonitoringpassword";

      // act
      const rerun = runMigrationScript(
        postgresEnvironmentWithMonitoringPassword(rotatedPassword),
      );
      const withOldPassword = await asMonitoringRole(firstPassword, "select 1");
      const withNewPassword = await asMonitoringRole(
        rotatedPassword,
        "select 1",
      );

      // assert
      expect(rerun.exitCode, rerun.output).toBe(0);
      expect(withOldPassword.exitCode).not.toBe(0);
      expect(withNewPassword).toEqual({ exitCode: 0, output: "1" });
    },
  );

  it("keeps the password out of the server log when the role cannot be created", async () => {
    // arrange
    const canaryPassword = "leakcanarypassword7731";
    const reservedRoleName = "pg_reserved_monitoring";

    // act
    const run = runMigrationScript(
      postgresEnvironmentWithMonitoringRole({
        user: reservedRoleName,
        password: canaryPassword,
      }),
    );
    const log = serverLog();

    // assert
    expect(run.exitCode).not.toBe(0);
    expect(log).toContain(reservedRoleName);
    expect(log).not.toContain(canaryPassword);
  });

  it("refuses a monitoring role that is one of the other database roles", async () => {
    // arrange
    const environment = postgresEnvironmentWithMonitoringRole({
      user: migrationUser.name,
      password: "collidingpassword",
    });

    // act
    const run = runMigrationScript(environment);
    const migrationLogin = await psqlAs({
      user: migrationUser.name,
      password: migrationUser.password,
      commands: ["select 1"],
    });

    // assert
    expect(run.exitCode).not.toBe(0);
    expect(run.output).toContain("must differ");
    expect(migrationLogin).toEqual({ exitCode: 0, output: "1" });
  });

  it("stops the deploy before any change when the monitoring keys are missing", () => {
    // arrange
    const withoutMonitoringKeys = postgresEnvironmentContents({});

    // act
    const run = runMigrationScript(withoutMonitoringKeys);

    // assert
    expect(run.exitCode).not.toBe(0);
    expect(run.output).toContain(
      "missing required env var: APP_DB_MONITORING_USER",
    );
  });
});
