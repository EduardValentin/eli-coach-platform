import { Client } from "pg";

type DatabaseRoleCredentials = {
  name: string;
  password: string;
};

type ReconcileDatabaseAccessOptions = {
  adminConnectionString: string;
  applicationUser: DatabaseRoleCredentials;
  migrationUser: DatabaseRoleCredentials;
  schemaName: string;
};

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function buildProvisioningStatements(
  databaseName: string,
  options: ReconcileDatabaseAccessOptions,
): string[] {
  const schemaName = quoteIdentifier(options.schemaName);
  const applicationUser = quoteIdentifier(options.applicationUser.name);
  const applicationPassword = quoteLiteral(options.applicationUser.password);
  const migrationUser = quoteIdentifier(options.migrationUser.name);
  const migrationPassword = quoteLiteral(options.migrationUser.password);
  const currentDatabase = quoteIdentifier(databaseName);

  return [
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${quoteLiteral(options.applicationUser.name)}) THEN CREATE ROLE ${applicationUser} LOGIN PASSWORD ${applicationPassword}; ELSE ALTER ROLE ${applicationUser} LOGIN PASSWORD ${applicationPassword}; END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${quoteLiteral(options.migrationUser.name)}) THEN CREATE ROLE ${migrationUser} LOGIN PASSWORD ${migrationPassword}; ELSE ALTER ROLE ${migrationUser} LOGIN PASSWORD ${migrationPassword}; END IF; END $$;`,
    `REVOKE ALL ON DATABASE ${currentDatabase} FROM ${applicationUser};`,
    `REVOKE ALL ON DATABASE ${currentDatabase} FROM ${migrationUser};`,
    `GRANT CONNECT ON DATABASE ${currentDatabase} TO ${applicationUser};`,
    `GRANT CONNECT, CREATE ON DATABASE ${currentDatabase} TO ${migrationUser};`,
    `CREATE SCHEMA IF NOT EXISTS ${schemaName};`,
    `ALTER SCHEMA ${schemaName} OWNER TO ${migrationUser};`,
    `REVOKE ALL ON SCHEMA public FROM ${applicationUser};`,
    `REVOKE ALL ON SCHEMA public FROM ${migrationUser};`,
    `GRANT USAGE ON SCHEMA public TO ${applicationUser};`,
    `GRANT USAGE ON SCHEMA public TO ${migrationUser};`,
    `REVOKE ALL ON SCHEMA ${schemaName} FROM ${applicationUser};`,
    `GRANT USAGE ON SCHEMA ${schemaName} TO ${applicationUser};`,
    `REVOKE CREATE ON SCHEMA ${schemaName} FROM ${applicationUser};`,
    `GRANT USAGE, CREATE ON SCHEMA ${schemaName} TO ${migrationUser};`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schemaName} TO ${applicationUser};`,
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${schemaName} TO ${applicationUser};`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationUser} IN SCHEMA ${schemaName} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${applicationUser};`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationUser} IN SCHEMA ${schemaName} GRANT USAGE, SELECT ON SEQUENCES TO ${applicationUser};`,
  ];
}

export async function reconcileDatabaseAccess(options: ReconcileDatabaseAccessOptions): Promise<void> {
  const client = new Client({
    connectionString: options.adminConnectionString,
  });

  await client.connect();

  try {
    const result = await client.query<{ current_database: string }>("select current_database()");
    const databaseName = result.rows[0]?.current_database;

    if (!databaseName) {
      throw new Error("Unable to resolve the current database name during provisioning.");
    }

    for (const statement of buildProvisioningStatements(databaseName, options)) {
      await client.query(statement);
    }
  } finally {
    await client.end();
  }
}
