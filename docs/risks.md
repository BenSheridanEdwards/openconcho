# Risks and known issues

What an architect dropped into this repo should know is fragile, deferred, or load-bearing-in-an-unobvious-way. Updated when something is identified; archived when resolved.

Format per row: **risk**, **impact**, **mitigation**, **owner**, **status**.

## Architecture-level

### CORS depends on Honcho upstream

- **Risk:** Honcho's `src/main.py` hardcodes the CORS allowed-origins list. `http://localhost:5173` (Vite dev) is not in the upstream list. Web-build dev against self-hosted Honcho fails preflight unless the local Honcho is patched.
- **Impact:** Web dev workflow requires a local Honcho patch (in-container `sed`, not persistent across `--force-recreate`). Desktop build (Tauri) is unaffected because Tauri requests bypass browser CORS.
- **Mitigation:** Recommend self-hosters either (a) use the Tauri build for development, or (b) patch their Honcho's CORS origins. Long-term fix is a PR to `plastic-labs/honcho` making `CORS_ORIGINS` env-driven.
- **Owner:** Upstream Honcho.
- **Status:** Open. Workaround documented in `AGENTS.md` is implicit — `pnpm dev:web` requires CORS to be permissive.

### Hardcoded `BenSheridanEdwards` references

- **Risk:** `.claude/rules/workflows.md` and `.github/PULL_REQUEST_TEMPLATE.md` reference `raw.githubusercontent.com/BenSheridanEdwards/openconcho/...` in their screenshot URL pattern. If this fork is renamed or rebased onto a different account, those URLs break.
- **Impact:** Screenshot links in old PRs would 404. New PRs would use stale URL templates.
- **Mitigation:** When forking/renaming, search/replace `BenSheridanEdwards/openconcho` in `.claude/rules/`, `AGENTS.md`, `CLAUDE.md`, and `scripts/setup-branch-protection.sh`.
- **Owner:** Whoever forks.
- **Status:** Acceptable — solo fork pattern.

## Quality gates

### Coverage threshold may be too high (or too low)

- **Risk:** Phase B set Vitest thresholds at 25% lines / 25% functions / 50% branches / 25% statements. These were chosen blind — the actual current coverage is unknown until first CI run.
- **Impact:** If too high, every PR fails the `test` job. If too low, the threshold is meaningless.
- **Mitigation:** First CI run on a PR after Phase B merge reveals actual coverage. Adjust in a follow-up PR. The intent is "starting floor, ratchet up" — drop the threshold to a known-passing value, then add a quarterly ratcheting policy.
- **Owner:** Whoever sees the first CI run.
- **Status:** Open.

### Rust cargo-check requires Linux Tauri system deps

- **Risk:** Phase B's `cargo-check` job installs `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `libgtk-3-dev` inline on every conditional run. `apt-get install` is slow (~60–90s per run).
- **Impact:** Desktop-touching PRs have a slower CI loop.
- **Mitigation:** `Swatinem/rust-cache@v2` caches the cargo deps but not apt-get. Could add a custom GitHub-Actions caching layer for apt packages, or maintain a custom Docker image. Not done — added complexity not justified at current volume.
- **Owner:** Future contributor when this becomes painful.
- **Status:** Acceptable.

### AI PR reviewer requires Anthropic API key

- **Risk:** `.github/workflows/ai-review.yml` requires `ANTHROPIC_API_KEY` repo secret. Without it the job fails with a clear error on every PR.
- **Impact:** Until the secret is set, every PR shows a failing `Claude review` check. Doesn't block merge (it's not a required status), but adds visual noise.
- **Mitigation:** Document the secret setup in the PR body for Phase D (#14). Future: add a no-op fallback when the secret is missing.
- **Owner:** Repo admin to set the secret.
- **Status:** Open.

### AI reviewer cost grows linearly with PR volume

- **Risk:** Each PR review is ~\$0.20–0.60 in Claude Opus tokens. At 10+ PRs/day, that's \$2–6/day. Spawned-session bursts (like the 9 PRs from this fleet rollout) compress that into hours.
- **Impact:** Bill grows quietly. No usage cap.
- **Mitigation:** Phase D doc mentions label-gating (`review:ai`) as a future cost control. Current path is unlabeled-by-default.
- **Owner:** Whoever notices the bill.
- **Status:** Acceptable while volume is low.

## Product behaviour

### Auto-name heuristic produces "Divinci" not "DiVinci"

- **Risk:** `deriveNameFromWorkspaceId("divinci-personal")` returns `"Divinci"` (capitalize first letter only). The user's actual agent name is `DiVinci`.
- **Impact:** Cosmetic — user must edit the name in the discovery row before clicking "Add 5 instances". A polished version of the heuristic would preserve known casings (e.g., a lookup table or pattern-based smart-case).
- **Mitigation:** Discovery UI shows the suggested name as editable in-place; user can fix before adding. The workspace-ID format (`<agent>-<camp>`) is a Hermes convention, not a Honcho one — could be wrong in other deployments entirely.
- **Owner:** Future PR — could be heuristic improvement, or could be a user-config "known agent names" preference.
- **Status:** Cosmetic.

### Multi-instance scoping assumes consistent workspace IDs

- **Risk:** Compare view auto-selects "first workspace" per column. If an instance has multiple workspaces in a non-deterministic order (e.g. a multi-tenant Honcho deployment), the auto-select may pick the wrong one.
- **Impact:** User has to manually pick the right workspace from the dropdown in each column.
- **Mitigation:** Dropdown is present; manual override works. Could add a URL search param to pre-pick workspaces per instance.
- **Owner:** Future enhancement.
- **Status:** Acceptable.

### Tauri webview localStorage is per-bundle-ID, not per-build

- **Risk:** Custom Tauri builds (e.g. forked product names) using the same `identifier` in `tauri.conf.json` share localStorage with each other. Multiple `OpenConcho.app` versions on the same machine clobber each other's instance lists.
- **Impact:** Confusion when running both stable and dev builds on the same machine.
- **Mitigation:** When rebranding (per AGENTS.md notes on identifier), change `productName` AND `identifier`. The README + risks list should call this out together.
- **Owner:** Whoever rebrands.
- **Status:** Acceptable — documented.

## Operational

### `make bootstrap` requires Playwright Chromium

- **Risk:** First-time setup runs `pnpm exec playwright install --with-deps chromium`. On constrained machines or offline setups, this fails noisily. The fallback (`pnpm install` alone) skips it but `make test-e2e` then doesn't work.
- **Impact:** Onboarding hiccup. Documented but not auto-recoverable.
- **Mitigation:** README references `make bootstrap`; if it fails, `pnpm install` is sufficient for non-E2E work.
- **Owner:** Future contributor.
- **Status:** Acceptable.

### Branch protection isn't enforced until script is run

- **Risk:** Phase C added `scripts/setup-branch-protection.sh` but **applying it is a manual one-time step** after the PR merges. Until then, `main` accepts direct pushes.
- **Impact:** Policy is documented but enforcement is opt-in.
- **Mitigation:** PR body for #5 calls this out explicitly. Set a reminder to run the script after the next time the repo is cloned to a new machine.
- **Owner:** Repo admin.
- **Status:** Open until script is run.

---

## How to use this file

When you discover something fragile or load-bearing-in-an-unobvious-way: **add a row here** in the same format. Don't bury it in a comment in some file no one reads.

When you fix a risk: **don't delete the row** — change `Status: Open` to `Status: Resolved <date> via #<PR>`. The history of what was fragile and how it got fixed is itself an architecture document.
