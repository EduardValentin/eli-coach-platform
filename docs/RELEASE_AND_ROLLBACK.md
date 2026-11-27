# Release and roll back PROD

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

The workflow stores the code in the deployment status description. A rollback uses the same codes; 11 cannot happen because it takes no backup. If the SSH session itself drops while the host finishes the deploy, the status reads failure (ssh exit 255) although the host serves the new release; the ledger is what decides what is live.

### Images PROD accepts

Before anything reaches the host, the deploy action accepts on PROD only digests of this app's own GHCR repositories (`ghcr.io/eduardvalentin/eli-coach-platform-{platform,db-migrations,postgres-runtime}@sha256:<digest>`; `node scripts/deploy/release-plan.mjs check-prod-image`). A tag, another registry or another image's repository stops the run. A release must name all three; a rollback names only the platform image.

## Rollback PROD

`.github/workflows/rollback-prod.yml` is started by hand from `main` (Actions, Rollback PROD, Run workflow). A rollback puts an earlier PROD release's recorded platform image live through the same switch, public check and switch-back as a release. It takes no backup, does not touch the infrastructure stack and runs no migrations, so Postgres and the schema stay exactly as they are. The workflow's own main-only check is only an early error: a dispatch runs the workflow file of the chosen branch. The `production` environment must therefore allow deployments from `main` only (Settings, Environments, production, Deployment branches); that rule, not the workflow, keeps any other branch's job from reaching PROD's secrets.

Inputs:

- `target_sha`: the full commit of a past PROD release. Empty means the release before the live one.
- `confirm_migration_releases`: needed only when going back past the previous release (see below).

**Plan job.** No environment and no host access. It reads the `production` deployments, keeps only `prod-release/v1` records that `github-actions[bot]` created and that once got a `success` status from it (a superseded deployment later turns `inactive`, so the latest status is not used), keeps the newest record per commit and orders the releases by `main`'s history. The live release is the one whose success is newest. `node scripts/deploy/release-plan.mjs rollback` then decides and writes the job summary: every release with its success time, subject, `live` / `default target` / `target` markers and whether it changed `apps/platform/db/drizzle/` since the release before it.

- Refused: no past successful PROD deployments; no release older than live when no target is given; a target that was never deployed to PROD; the release already live; a target whose recorded platform image is not one of this app's GHCR digests; a platform image no longer in GHCR (`docker buildx imagetools inspect`).
- A target newer than live (roll forward after an earlier rollback) needs no confirmation.
- A target older than the previous release goes back over N releases (after the target, up to and including live). M of them changed the migrations. The run is refused, printing N, M and those releases, unless `confirm_migration_releases` equals M. Their migrations stay applied; the migration rule in `AGENTS.md` is what lets the older image run against them.

**Rollback job.** Waits for the `production` approval, then connects with the PROD-only identity, records a `prod-release/v1` deployment with `kind: rollback`, `ref` = the target, `previousSha` = live, the target's platform image and the live release's migration and Postgres runtime images, and runs `deploy.sh` with `DEPLOY_MODE=rollback`, `RELEASE_SHA=<target>` and `EXPECTED_LIVE_SHA=<live per GitHub>`. When the host's ledger disagrees with GitHub the host refuses (exit 10); that divergence follows a half-recorded deploy and is fixed by hand. The deploy files come from `main`, not the target commit.

**On the host.** `DEPLOY_MODE=rollback` takes the lock and compares the live release as usual, refuses the commit already live (exit 10) and a host with no release (exit 12), and refuses (exit 10) unless its own ledger records that commit with exactly that platform image. GitHub's deployment records can be written by any workflow run in the repository, so the ledger, which only `deploy.sh` writes, is what vouches for the image; a host whose ledger was lost can only roll forward through a release. It then pulls the platform image (a failed pull changes nothing, exit 12), starts the new colour, switches and checks. The ledger line has `kind: rollback`, the target's platform image, the live release's migration and Postgres runtime images (those are what still run) and no snapshot.

**When a rollback is refused unexpectedly.** Any workflow run in the repository can write deployment records as `github-actions[bot]`. A forged record cannot change which image the host runs, but it can make the plan or the host refuse: a newer record for the live commit or the target with another image, or one for a commit that was never live. Find it under the repository's `production` deployments and delete it (`gh api -X DELETE repos/<owner>/<repo>/deployments/<id>` after marking it inactive).

## Records

**Host ledger.** `/srv/apps/eli-coach-platform/releases.jsonl`, one line per successful switch: `time`, `kind`, `sha`, `images` (`platform`, `migration`, `postgresRuntime`), `color`, `snapshot`. The last line is the live release.

**GitHub deployment.** One per PROD deploy, created by the job (`environment: { name: production, deployment: false }` keeps the approval and the environment secrets but stops GitHub creating its own): `environment=production`, `ref=<sha>`, `required_contexts=[]`, payload `{"schema":"prod-release/v1","kind":"release|rollback","sha","previousSha","images":{...}}`, statuses `in_progress` then `success` or `failure`.

**Registry.** Nothing deletes image versions from GHCR. A future cleanup must keep the digests in the last 10 successful `prod-release/v1` payloads.

## Checking the deploy files

`pnpm check:deploy-config` renders both environments and shellchecks the scripts. `pnpm check:workflows` runs actionlint. `pnpm test:deploy-simulation` runs the real `deploy.sh` in a throwaway container with its own Docker daemon, against a real Traefik, stub applications and a stub of `/usr/local/bin/app-backup`: happy path, zero failed requests during a release, switch-back, refusals, backup failures, a rollback (no backup, no migrations, the same Postgres container, the earlier platform digest live) and the TEST sequence. CI runs both in the `Deploy simulation` job.
