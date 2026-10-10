# Database Foundations

This project uses Drizzle ORM with migration-driven schema changes only.

## Rules

- Generate migrations with `pnpm db:generate`
- Apply migrations and seeds with `pnpm db:migrate`
- Never use `drizzle-kit push`
- Runtime route modules must depend on services, not direct database calls
- Keep server wiring in app-level container modules, not feature modules or route files

## Migration Artifacts

- `apps/platform/db/drizzle/*.sql` contains the reviewed SQL migrations that actually run against Postgres
- `apps/platform/db/drizzle/meta/*` contains Drizzle's schema history journal and snapshots used to diff future schema changes
- Commit both directories together when schema changes land
- Prefer readable SQL migration file names before merge and keep the matching tag in `apps/platform/db/drizzle/meta/_journal.json` aligned with the SQL file name
- Migrations own structure only. Reference rows the application needs (the `WAITLIST_MODE` flag, the store's product types and goals) live in `apps/platform/db/seeds/*.sql`: idempotent plain statements, each file ending its last statement with `;`, applied in filename order by the one runner `apps/platform/db/apply-seeds.ts` after every migrate
- A seed inserts a missing row and never overwrites a stored one, so a release never flips an operator's toggle; changing a seeded row's label or order is a migration's job

## Connection Roles

Three database access paths exist:

- Runtime app connection pieces: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`
- Derived migration connection string: built from the migration credentials plus the target Postgres host and port at execution time
- Bootstrap/admin access: setup-only credentials used to reconcile roles, schema ownership, grants, and default privileges

The application schema is `app`. Bootstrap owns role creation and schema/grant reconciliation. Migrations own table creation and evolution inside that schema.

## Local Development

Prepare the local env files and store asset root once:

```bash
pnpm secrets:local:prepare
pnpm store:assets:local:prepare
pnpm client:media:local:prepare
pnpm client:resources:local:prepare
```

Start the full local stack:

```bash
pnpm dev:all
```

Local Postgres binds to `127.0.0.1:55437` by default. Override it with `LOCAL_POSTGRES_PORT=... pnpm dev:all`; the local app process receives the same port through `DATABASE_PORT`. Use `LOCAL_POSTGRES_CONTAINER_NAME=...` when another local branch or project already owns the default Docker container name.

`pnpm dev:all` now performs the tracked local database setup flow:

1. start Docker Postgres
2. reconcile roles and grants
3. run Drizzle migrations
4. apply the seed folder

Fresh Docker volumes also run bootstrap automatically through the Postgres init hook in `docker-compose.local.yml`.

If you need to rerun the database setup manually against an existing local volume:

```bash
pnpm db:setup:local
```

You can also run the steps individually:

```bash
pnpm db:bootstrap:local
pnpm db:migrate
```

## Deploy Environments

TEST deploys run the same sequence before the application starts:

1. bootstrap/reconcile roles and grants
2. run `drizzle-kit migrate`
3. apply the seed folder with `node db/apply-seeds.ts`

The migration image runs both steps as its default command. The migration runner executes against the migration user and blocks deploy completion on failure.

For deployed environments, keep the runtime and migration credentials separate:

- the app runtime env file should expose only the runtime connection pieces
- the Postgres/bootstrap automation env file should own bootstrap credentials and role passwords
- migration execution should derive its connection string from those pieces when it runs

For TEST, the derived migration connection should target the Postgres container on the internal Docker network, not `127.0.0.1`.
