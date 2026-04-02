# Database Foundations

This project uses Drizzle ORM with migration-driven schema changes only.

## Rules

- Generate migrations with `pnpm db:generate`
- Apply migrations with `pnpm db:migrate`
- Never use `drizzle-kit push`
- Runtime route modules must depend on services, not direct database calls
- Keep server wiring in app-level container modules, not feature modules or route files

## Migration Artifacts

- `packages/db/drizzle/*.sql` contains the reviewed SQL migrations that actually run against Postgres
- `packages/db/drizzle/meta/*` contains Drizzle's schema history journal and snapshots used to diff future schema changes
- Commit both directories together when schema changes land
- Prefer readable SQL migration file names before merge and keep the matching tag in `packages/db/drizzle/meta/_journal.json` aligned with the SQL file name

## Connection Roles

Three database access paths exist:

- `DATABASE_URL`: runtime app user with DML-only access
- `DATABASE_MIGRATION_URL`: migration user used for Drizzle migrations and seeds
- Bootstrap/admin access: setup-only credentials used to reconcile roles, schema ownership, grants, and default privileges

The application schema is `app`. Bootstrap owns role creation and schema/grant reconciliation. Migrations own table creation and evolution inside that schema.

## Local Development

Prepare local env files once:

```bash
pnpm secrets:local:prepare
```

Start the full local stack:

```bash
pnpm dev:all
```

`pnpm dev:all` now performs the tracked local database setup flow:

1. start Docker Postgres
2. reconcile roles and grants
3. run Drizzle migrations
4. apply idempotent seed files

Fresh Docker volumes also run bootstrap automatically through the Postgres init hook in `docker-compose.local.yml`.

If you need to rerun the database setup manually against an existing local volume:

```bash
pnpm db:setup:local
```

You can also run the steps individually:

```bash
pnpm db:bootstrap:local
pnpm db:migrate
pnpm db:seed:local
```

## Deploy Environments

TEST deploys run the same sequence before the application starts:

1. bootstrap/reconcile roles and grants
2. run `drizzle-kit migrate`
3. apply idempotent seeds

The migration runner executes against the migration user and blocks deploy completion on failure.

For deployed environments, keep the runtime and migration credentials separate:

- the app runtime env file should expose only `DATABASE_URL`
- the Postgres/bootstrap automation env file should own bootstrap credentials, role passwords, and `DATABASE_MIGRATION_URL`

For TEST, `DATABASE_MIGRATION_URL` should point at the Postgres container on the internal Docker network, not `127.0.0.1`.
