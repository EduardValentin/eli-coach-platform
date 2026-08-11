# Eli Coach Platform

One full-stack React Router v7 app serving three surfaces — the public site, the client portal, and the coach portal — backed by one PostgreSQL database and deployed as a single container. It is a modular monolith: the surfaces are boundaries in code, not separate deployables.

Alongside it lives a React reference prototype in [designs/react-reference-app](designs/react-reference-app), originally exported from the [Landing page design](https://www.figma.com/design/VOzPBVwhcWSGqbqDtt3h4l/Landing-page-design) Figma project. It is a design reference only and never part of the production runtime.

## The Tree

```text
/apps/platform
  /db            Drizzle config and the migrations CI checks for drift
  /public        served as-is: portal service workers, icon, hero media
  /scripts       build-time checks, run after react-router build
  /src
    /features    coaching-bundles, store, waitlist
    /surfaces    public-site, client-portal, coach-portal
    /server      composition root, runtime wiring, resource routes no surface owns
    /types       ambient type declarations
  /test-support  test harnesses shared across features, reached through the ~test-support alias
/packages        config, content, db, domain, infrastructure, ui
/deploy          per-environment Compose stacks
/docker          image definitions
/docs            database and secret-management guides
/scripts         local development and secret helpers, plus the deploy scripts CI ships to the TEST host
/tools           boundary-rule self-tests
/designs/react-reference-app
```

## Documentation

| Document | Covers |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Boundaries, layering, where a file goes, PWA scope, deployment model |
| [AGENTS.md](AGENTS.md) | Repository operating rules for contributors and agents |
| [DESIGN.md](DESIGN.md) | Design system and accessibility direction |
| [PRD.md](PRD.md) | Product requirements and canonical domain vocabulary |
| [docs/](docs/) | [DATABASE.md](docs/DATABASE.md), [SECRET_MANAGEMENT.md](docs/SECRET_MANAGEMENT.md) |

Boundary rules R1–R7 are stated and reasoned in [eslint.config.mjs](eslint.config.mjs) and proven in [tools/lint-boundaries.test.mjs](tools/lint-boundaries.test.mjs). Those two files are the single source of truth for the rules.

## Requirements

- pnpm `10.33.0` — never npm or yarn in the workspace
- Node `>=24.14.1 <25` — `.node-version` pins the exact version and is what CI reads; `.nvmrc` carries the same value for `nvm use` and must be kept in sync with it
- Docker, for local Postgres and the testcontainer-backed integration suites

## Setup

```bash
pnpm install
pnpm secrets:local:prepare   # create gitignored /.env and /.env.postgres
pnpm db:bootstrap:local      # create the local database and roles
```

`/.env` is loaded for local app startup and `/.env.postgres` by local Docker Postgres. TEST and PROD runtime secrets are not owned here — `terraform-infra` provisions them.

## Running

```bash
pnpm dev:all         # platform, local Postgres, and the reference prototype
pnpm dev:platform    # platform only
pnpm start:platform  # serve the built app locally, after pnpm build
```

Local Postgres binds to `127.0.0.1:55437`. Override `LOCAL_POSTGRES_PORT` for a parallel run, and `LOCAL_POSTGRES_CONTAINER_NAME` too when another branch or project already uses the container name.

The reference prototype sits outside the pnpm workspace and uses npm on the same Node version:

```bash
cd designs/react-reference-app
npm install
npm run dev
```

## Checks

```bash
pnpm lint            # eslint over apps and packages
pnpm typecheck       # tsc across every workspace package
pnpm test            # vitest: unit and integration projects
pnpm build           # build the platform app
pnpm test:lighthouse # Lighthouse CI over the prerendered public pages
```

The reference prototype is covered by its own `npm test` and `npm run build`, which CI runs as a separate step; no workspace gate reaches it.

## Database

```bash
pnpm db:bootstrap:local  # create the local database and roles
pnpm db:setup:local      # re-run local setup
pnpm db:generate         # generate a Drizzle migration from schema changes
pnpm db:migrate          # apply migrations
pnpm docker:local:up     # start local Postgres
pnpm docker:local:down   # stop it
```

Database state must be reproducible from migrations and application code. See [docs/DATABASE.md](docs/DATABASE.md).

## Project Tracking

Epics and user stories live in [Linear — Eli Coach Platform](https://linear.app/general-hub/project/eli-coach-platform-ab5fc387cfba). Epics are issues labeled **Epic**; user stories are sub-issues of their parent epic.
