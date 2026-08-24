# Claude Code Web Sessions

Sessions on [claude.ai/code](https://claude.ai/code) run in an ephemeral, isolated VM that starts from a bare container. `.claude/hooks/session-start.sh` (registered in `.claude/settings.json`) provisions the full toolchain there on session start, so every command in [README.md](../README.md) works remotely exactly as it does locally.

## What the hook provisions

- Node from `.node-version` through the sandbox's nvm, and the pnpm pinned in `package.json`.
- Workspace dependencies (`pnpm install --frozen-lockfile`) and the design reference app's npm dependencies.
- A running Docker daemon, configured for the sandbox's egress proxy — required by the testcontainers integration suites and `docker-compose.local.yml`.
- The container images the suites start: the Postgres image from `docker/postgres-runtime-base-image.txt`, the compose Postgres image, WireMock from `wire-mock-container.ts`, and the testcontainers reaper. The hook re-reads those pins on every run, so bumping them needs no hook change.
- `/.env` and `/.env.postgres` via `pnpm secrets:local:prepare`.
- Session environment: the Node PATH, `CHROME_PATH` and `PUPPETEER_EXECUTABLE_PATH` pointing at the sandbox Chromium (Lighthouse, `pnpm terms:pdf`), and `NODE_USE_ENV_PROXY=1` so the app's outbound `fetch` can traverse the egress proxy in dev mode.

The hook only runs in remote sessions (`CLAUDE_CODE_REMOTE`), is idempotent, and the sandbox snapshot is cached after it completes — the first session pays for downloads, later ones re-run it as a fast no-op. `.claude/settings.json` gives it a 2400s timeout for cold starts.

## Known sandbox differences

- Sessions run as root. One asset-store unit scenario depends on permission bits root ignores and skips itself there; `lighthouserc.cjs` adds `--no-sandbox --headless=new` only under root. Neither changes what CI runs.
- `pnpm test:lighthouse` executes fully, but the performance category can score marginally under CI's 0.9 threshold on sandbox hardware (accessibility, best-practices, and SEO gates behave normally). Treat CI as authoritative for the performance gate.

## Reaching the app from outside the sandbox

There is no direct path. The session VM accepts no inbound connections, and its egress runs through an allowlisting HTTPS proxy that carries neither WebSockets, raw TCP, nor tunneling agents (ngrok and similar are certificate-pinned and blocked). A dev server on `localhost:3000` inside a session cannot be exposed publicly.

What works instead:

- **In-session verification**: ask Claude to drive the app with the sandbox Chromium and post screenshots into the conversation — readable from the Claude mobile app.
- **From a phone or any browser**: merge to `main`; CI deploys the image set to the TEST host over Tailscale, and Traefik serves it at `https://<TEST edge hostname>/eli-coach-platform` to devices on the tailnet.
- **On your machine**: pull the session down with `claude --teleport <session-id>` and run `pnpm dev:all` locally.
