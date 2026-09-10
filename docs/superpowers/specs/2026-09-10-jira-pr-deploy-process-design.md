# JIRA-Driven Ticket → PR → Deploy Process

**Date:** 2026-09-10
**Status:** Approved design, pending implementation plan
**JIRA project:** NERD (board 34) — https://tonyweeg.atlassian.net/jira/software/projects/NERD/boards/34/
**Repo:** tonyweeg/NerdfootballAI
**Hosting:** Firebase project `nerdfootball` (hosting + functions)

## 1. Why this exists

On 2026-09-10 production was reverted for ~16 minutes. Root cause was not a missing
review step — it was **drift**: a deploy at 14:13 UTC shipped an uncommitted working
tree, leaving production ~2,100 lines ahead of `main`. A later deploy from a clean
`HEAD` silently reverted 17 files and deleted a live page, and nothing in the system
could detect it. A misread signal (`uploading new files [0/1]`, which only reflects
Firebase blob deduplication across releases) turned the drift into a confident
false claim that the changes had never been deployed.

This process is additive, bolted onto a working production system. No phase may
leave production worse than it is today.

## 2. The invariant

> **Production always equals `origin/main`.**

Every mechanism below enforces or verifies that sentence. When CI is the only path
to production, drift becomes structurally impossible rather than merely discouraged.

## 3. Verified ground truth (2026-09-10)

| Fact | Status |
|---|---|
| `gh` CLI | 2.98.0, authed as `tonyweeg`, scopes `repo`, `workflow` |
| JIRA MCP (ROVO) | **Not connected.** Access via REST API + `JIRA_API_TOKEN` in `.env` |
| CI | `.github/workflows/browser-tests.yml`, disabled, `workflow_dispatch` only |
| Current-era tests | `season-config-drift`, `season-config-parity`, `scraper-units` — **56/56 green in 1.5s** |
| Legacy tests | 7 files from 2025-09 + 6 quarantined OAuth tests — to be deleted |
| Jest blocker | Truncated `auraglow/package.json` (+ worktree copy) killed jest-haste-map before any test ran. Fixed via `modulePathIgnorePatterns`; `auraglow/` deleted; stale worktree removed |
| Hosting preview channels | Available, unused |
| Test target URL | Hardcoded `http://localhost:8080`; needs configurable base URL |

## 4. Phase 0 — Drift guard

`scripts/prod-drift-check.sh`

- Fetches the live Hosting release manifest:
  `GET https://firebasehosting.googleapis.com/v1beta1/sites/nerdfootball/versions/<id>/files`
  (auth: `gcloud auth print-access-token`, header `x-goog-user-project: nerdfootball`;
  note Tony's shell exports another project's `GOOGLE_APPLICATION_CREDENTIALS`, so
  commands must be prefixed with `env -u GOOGLE_APPLICATION_CREDENTIALS`)
- Compares manifest file hashes against the local `HEAD` tree
- Exits non-zero listing every drifted path

Runs on demand and nightly in CI. Standalone value: this alone would have caught the
2026-09-10 incident in seconds.

**Acceptance:** running it today reports zero drift; deliberately editing a public file
without deploying makes it report exactly that file.

## 5. Phase 1 — Ticket → branch → PR → preview

| Step | Mechanism |
|---|---|
| Ticket | `scripts/jira.js create` → `NERD-x` via REST API v3, token from `.env` |
| Branch | `NERD-123-short-slug`, cut from fresh `main` |
| PR | `gh pr create`, title `NERD-123: summary`, body = acceptance criteria + test plan + smoke checklist + JIRA link |
| Preview | Action deploys Hosting channel `pr-<num>`, comments URL on the PR |
| Review | `/code-review` on the diff; findings become fix commits or new NERD bug tickets (per RULES.md PR-review workflow) |

`scripts/jira.js` supports `create`, `transition`, `comment`. Transition IDs are
**fetched at runtime** for the NERD workflow — the IDs in RULES.md belong to PATTERN
and must not be assumed to match.

All testing happens on the preview URL. Never on production.

## 6. Phase 2 — Merge gate

Test strategy, explicitly non-legacy:

- **Keep:** `season-config-drift`, `season-config-parity`, `scraper-units` (56 tests, 1.5s).
  These guard the in-flight SEASON_CONFIG migration.
- **Delete:** `accessibility`, `grid`, `homepage`, `oauth-basic`, `performance`,
  `survivor`, `setup.js`, and all of `tests/temp-disabled/`. Written against the 2025
  app, untouched for a year, require a hand-run local server.
- **Build:** a smoke suite covering the "Core Features That Must Work" list already in
  CLAUDE.md — each page returns 200, key DOM markers present, no ghost user
  `okl4sw2aDhW3yKpOfOwe5lH7OQj1`, hamburger nav intact. Fast HTTP + DOM assertions,
  parameterized by base URL so the same suite runs against a preview channel or prod.

Then: re-enable the workflow on `pull_request`, make it a **required status check**, and
enable branch protection on `main` (no direct pushes, PR required). Branch protection is
the structural fix that makes "deploy uncommitted work" impossible — uncommitted work can
no longer reach `main`.

## 7. Phase 3 — CI deploys on merge

`.github/workflows/deploy.yml`, on push to `main`:

1. Deploy hosting via `FIREBASE_SERVICE_ACCOUNT` secret
2. Run the smoke suite against production
3. Transition the referenced NERD ticket to Done

Functions deploys stay manual initially — larger blast radius, earned later.

Manual `firebase deploy` remains available for emergencies. It is not forbidden, it is
**detected**: the Phase 0 drift check catches any deploy that did not come from `main`.

**Rollback:** redeploy the previous release, or `firebase hosting:clone` from the prior
version id. Release ids are listed via the Hosting versions API.

## 8. Open questions

1. **Preview URLs and Firebase Auth.** Channel URLs (`nerdfootball--pr-12-abc.web.app`)
   are not in Auth's authorized domains, so sign-in fails there. Tony's standing rule is
   that testing sessions must have him authenticated. Options: add domains per channel,
   or use one standing `staging` channel with a stable authorized URL. **Unresolved.**
2. **Functions in CI** — deferred, not designed.
3. **Smoke suite depth** — starts shallow (200s + DOM markers); deepens as incidents teach us.

## 9. Non-goals

- Rewriting or resurrecting the 2025 test suite
- Refactoring application code as part of this work
- Multi-environment (dev/staging/prod) Firebase projects
