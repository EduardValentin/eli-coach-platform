# Release to PROD

Every commit that lands on `main` and passes TEST gets its own PROD approval request. Approving one deploys exactly that commit, with the image digests that run built; nothing is rebuilt.

## Promotion

`.github/workflows/ci.yml` runs `deploy_prod` after `deploy_test` succeeds. The job declares the `production` GitHub environment, so it waits for a required reviewer. Each main commit queues its own request; a newer commit does not cancel an older one, and an unapproved request goes red after 30 days.

The job reaches PROD only through the PROD-only Tailscale identity (the `tag:ci-prod-deploy` tag), with the pinned SSH host key. Nothing reaches PROD until every value below exists, so the stage fails closed on a missing one:

| Name                             | Kind     | Use                                                    |
| -------------------------------- | -------- | ------------------------------------------------------ |
| `PROD_NODE_HOSTNAME`             | variable | PROD's tailnet name                                    |
| `PROD_EDGE_HOSTNAME`             | variable | the public host name Traefik routes (`evoa.fit`)       |
| `PROD_SSH_KNOWN_HOSTS`           | secret   | the pinned host key; a placeholder fails the key check |
| `PROD_TAILSCALE_OAUTH_CLIENT_ID` | secret   | the PROD-only CI identity                              |
| `PROD_TAILSCALE_OAUTH_SECRET`    | secret   | the PROD-only CI identity                              |
| `GHCR_PULL_USERNAME`, `_TOKEN`   | secret   | image pulls on the host (repository scope)             |

### Refusal rule

The job reads the live release from the host ledger, then runs `node scripts/deploy/release-plan.mjs promote <live|none> <commit>`. A commit is promoted only when nothing is live or the live commit is a strict ancestor of it. The job refuses the commit already live, a commit older than live (the message points at the rollback action), and a commit on a diverged line of history. `deploy.sh` repeats the comparison under its lock through `EXPECTED_LIVE_SHA`, so two approvals given close together cannot both switch: the second exits 10 and needs a re-run and a fresh approval.

### Sequence on the host

`scripts/deploy/deploy.sh` runs the same sequence for TEST and PROD:

1. Take the lock `/srv/apps/eli-coach-platform/deploy.lock`, then refuse when `EXPECTED_LIVE_SHA` differs from the ledger's live commit (`none` means no release). PROD requires the variable; TEST may omit it.
2. Pull the application images.
3. PROD only: `BACKUP_LABEL=predeploy-<sha> /usr/local/bin/app-backup db eli-coach-platform`. Exit 0 with a final `snapshot=<id>` line continues. Exit 3 (Postgres container missing) continues only on the first deploy: the ledger has no release, there is no `active-color` file and no Postgres data directory. Anything else stops the deploy.
4. Bring up the infrastructure stack (Postgres is recreated only when its image digest changes), run the migrations, start the new colour and wait for its container health.
5. Render the Traefik file for the new colour and write `active-color`.
6. Public check: three consecutive `200`s from `https://<edge host><base path>/readyz`, reached through the host's own Traefik at the `TRAEFIK_BIND_IP` that `/srv/edge/.env` names (loopback when that is `0.0.0.0`), each carrying `X-Stack-Color: <new colour>`. PROD verifies the certificate; TEST does not.
7. On a pass: append the ledger line, then remove the old colour. On a failure: restore the old routing, check it again, then remove the new colour.

The script ignores a dropped session (SIGHUP, a closed pipe) and tees its output to `/srv/apps/eli-coach-platform/last-deploy.log`, so a lost SSH connection neither stops the deploy nor leaves the edge half-switched. The host needs `curl`, `flock` and `timeout` besides Docker. The old colour keeps running until step 7, so a failed release never takes the previous one down. A switch-back does not undo migrations; the migration rule in `AGENTS.md` is what keeps the previous image working against the newer schema.

### Exit codes

| Code | Meaning                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------- |
| 0    | Deployed and recorded                                                                                   |
| 10   | Refused: the lock is held or the live release is not the expected one                                   |
| 11   | The pre-deploy backup failed; nothing changed                                                           |
| 12   | Failed before the switch (inputs, pull, migrations, health); the new colour is removed                  |
| 20   | The public check failed and the previous release is serving again (on a first deploy: no routing)       |
| 30   | The switch-back was impossible or failed; the new colour stays up for inspection and PROD needs a person |

The workflow stores the code in the deployment status description. If the SSH session itself drops while the host finishes the deploy, the status reads failure (ssh exit 255) although the host serves the new release; the ledger is what decides what is live.

## Records

**Host ledger.** `/srv/apps/eli-coach-platform/releases.jsonl`, one line per successful switch: `time`, `kind`, `sha`, `images` (`platform`, `migration`, `postgresRuntime`), `color`, `snapshot`. The last line is the live release.

**GitHub deployment.** One per PROD deploy, created by the job (`environment: { name: production, deployment: false }` keeps the approval and the environment secrets but stops GitHub creating its own): `environment=production`, `ref=<sha>`, `required_contexts=[]`, payload `{"schema":"prod-release/v1","kind":"release","sha","previousSha","images":{...}}`, statuses `in_progress` then `success` or `failure`.

**Registry.** Nothing deletes image versions from GHCR. A future cleanup must keep the digests in the last 10 successful `prod-release/v1` payloads.

## Checking the deploy files

`pnpm check:deploy-config` renders both environments and shellchecks the scripts. `pnpm check:workflows` runs actionlint. `pnpm test:deploy-simulation` runs the real `deploy.sh` in a throwaway container with its own Docker daemon, against a real Traefik, stub applications and a stub of `/usr/local/bin/app-backup`: happy path, zero failed requests during a release, switch-back, refusals, backup failures and the TEST sequence. CI runs both in the `Deploy simulation` job.
