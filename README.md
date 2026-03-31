# Eli Coach Platform

Single full-stack React Router app for the public site, client portal, and coach portal.

## Local Development

Create local env files once:

```bash
pnpm secrets:local:prepare
```

This creates gitignored local files in the repo root:

- [/.env](/Users/trocaneduard/Documents/Personal/eli-coach-platform/.env)
- [/.env.postgres](/Users/trocaneduard/Documents/Personal/eli-coach-platform/.env.postgres)

How env loading works:

- `/.env` is loaded for local app startup
- `/.env.postgres` is used by local Docker Postgres
- TEST and PROD runtime secrets are not owned here; they are provisioned by `terraform-infra`

Start everything locally:

```bash
pnpm dev:all
```

Or start only the app:

```bash
pnpm dev:platform
```
