# Agent Operating Rules

Source: https://x.com/mikenevermiss/status/2068197417506222428?s=46

## Behavioural Rules

### Think Before Coding
State assumptions before writing code. Surface tradeoffs. Ask before guessing on architecture, data shape, security, or irreversible changes. Push back when a simpler approach exists.

### Simplicity First
Write the minimum code that solves the task. No speculative features. No abstractions for single-use code. If the solution looks over-engineered, simplify it.

### Surgical Changes
Touch only what the task requires. Do not reformat, rename, or refactor adjacent code unless it is required for the change. Match existing style.

### Goal-Driven Execution
Define success before implementation. Keep working until that definition is met and verified. Do not ask for step-by-step instructions when the path can be inferred.

### Deterministic Control Flow
Do not use model calls for deterministic decisions. Routing, retries, status checks, thresholds, and branching rules belong in code.

### Hard Token Budgets
For long tasks, set a clear investigation budget. If the budget is reached without a verified solution, write findings and next steps to `PROGRESS.md` and stop cleanly.

### One Agent, One Directory
Parallel agents must use separate git worktrees or directories. No two agents should mutate the same checkout at the same time.

### Checkpoint Multi-Step Work
For tasks longer than three steps, create or update `PROGRESS.md` with: completed work, findings, next action, blockers, and verification status.

### Fail Loudly
If a command, test, build, hook, or assumption fails, report the exact failure. Do not relabel partial success as done. Passing tests only count when they cover the changed behavior.

### Unique Skill Descriptions
Each skill must describe exactly one job. If two skills could be selected for the same reason, rename or split them before relying on them.

### Separate Research From Implementation
If a task needs broad reading or multiple source lookups, do research first and produce a compact report. Start implementation from that report, not from a sprawling context window.

### Scoped Hooks Only
Hooks must have explicit scope: file extension, path, command, or session event. Avoid unconditional hooks on every tool call. Batch logging to session end where possible.

## What Not To Touch Without Explicit Approval

- Secrets, credentials, tokens, keys, and local environment files.
- Production configuration, deployment settings, billing, permissions, and security controls.
- Generated artifacts or snapshots unless the task explicitly requires updating them.
- Public publishing, releases, package publication, or external messaging.
- Destructive git operations including branch deletion, force-push, and history rewrite.

## Default Success Criteria

A task is not done until the changed behavior is verified by deterministic evidence: tests, build output, typecheck/lint results, screenshots/video for UI behavior, or another concrete artifact that does not depend on the model's judgment.

---

# openconcho

Frontend UI for self-hosted Honcho instances — browse memories, peers, sessions, conclusions, and chat with memory context. Ships as a web app (`@openconcho/web`) and a Tauri desktop wrapper (`@openconcho/desktop`).

## Definition of Done

A change is "done" only when **all** of these are true:

- **Functionality verified visually** — for UI changes, working state captured as a screenshot in the PR body (see "Pull Request evidence" below)
- **Quality gates green** — `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass locally; the same checks pass in PR CI
- **Tests added** — new behaviour has a failing-then-passing unit/integration test; bug fixes have a regression test
- **Evidence in PR body** — answers the 6 evidence questions (Intent, Risk, Standards, Test evidence, Out-of-scope, Architect focus)
- **Conventional commit** — `<type>(<scope>): <description>` per commitlint
- **Worktree workflow** — work happened in an isolated git worktree, not the main checkout (see below)
- **Merged via PR** — never direct push to `main`

The bar is **evidence, not assertion**. "It works on my machine" is not done. A screenshot of the working feature is. A passing test is. A QA section in the PR body listing what you actually clicked and what you saw is.

## Worktree workflow (mandatory)

All feature work happens in an isolated git worktree, never directly in the main checkout. This keeps the main checkout clean (preview servers, IDE, agent sessions don't fight over disk state), allows multiple features in parallel, and matches how Claude Code's `spawn_task` isolates agent work — humans follow the same pattern.

```bash
# Start a new feature
git fetch origin main
git worktree add ../openconcho-<slug> -b feat/<slug> origin/main
cd ../openconcho-<slug>
pnpm install        # or: ln -s ../openconcho/node_modules . to share install

# Do work, commit, push, open PR

# After merge
cd ../openconcho
git worktree remove ../openconcho-<slug>
git branch -d feat/<slug>
```

**For Claude Code / Cursor / other agents:** `spawn_task` with `isolation: "worktree"` does this automatically. Verify your working directory is `openconcho-<feature>` or `/tmp/openconcho-<feature>/`, **not** the main `openconcho/` checkout. If you find yourself editing files in the main checkout, stop and create a worktree first.

## Commands

`make` is the canonical interface; it shells out to pnpm scripts which shell out to turborepo. CI calls the same targets — `make help` lists everything.

| Command | Purpose |
|---------|---------|
| `make bootstrap` | Install deps + Playwright Chromium (run once after clone) |
| `make dev-web` | Vite dev server on http://localhost:5173 |
| `make dev-desktop` (or `make dev`) | Tauri desktop app |
| `make build` | Turbo: build web + desktop |
| `make lint` | Biome check |
| `make typecheck` | tsc --noEmit |
| `make test` | Vitest (unit + integration), excludes `e2e/` |
| `make test-e2e` | Playwright e2e (uncached) |
| `make check` | lint + typecheck + test |
| `pnpm --filter @openconcho/desktop cargo-check` | Local Rust/Tauri compile check before pushing desktop changes |
| `pnpm --filter @openconcho/web generate:api` | Regen `src/api/schema.d.ts` from `openapi.json` |

## Structure

| Path | Purpose |
|------|---------|
| `packages/web/` | Vite + React 19 + TanStack Router/Query SPA |
| `packages/web/src/routes/` | TanStack Router file-based routes (flat-route syntax) |
| `packages/web/src/components/` | Feature components grouped by domain |
| `packages/web/src/api/` | openapi-fetch client + TanStack Query hooks |
| `packages/web/src/lib/` | Config (localStorage) + theme utilities |
| `packages/web/src/hooks/` | Custom React hooks |
| `packages/web/src/test/` | Vitest unit/integration tests + setup |
| `packages/web/e2e/` | Playwright e2e specs |
| `packages/desktop/` | Tauri shell that bundles the built web app |
| `.claude/rules/` | Coding conventions (auto-loaded) |
| `docs/` | Architecture and references |

## Code Style

Read `.claude/rules/coding-standards.md` when writing or reviewing any code file.

## Workflows

Read `.claude/rules/workflows.md` for recurring task patterns.

## Architecture

Read `docs/architecture.md` for component overview, data flow, and design decisions.

## Key Constraints

- **No hardcoded URLs** — all connection config lives in `localStorage` under `openconcho:config`
- **TanStack Router flat-route params** — always cast `params` as `as never` at `navigate()` and `<Link>` callsites
- **`framer-motion` Variants typing** — import `type Variants` and annotate objects; never use `as const` on variant objects
- **Auth is optional** — token header only sent when non-empty; `checkConnection()` detects if auth is required
- **CSS variables only** — no Tailwind color utilities for theme-aware colors; use `var(--text-1)` etc.
- **Shared deps via pnpm catalog** — version-pinned in `pnpm-workspace.yaml`; reference as `"catalog:"` in package.json
- **Conventional commits enforced** — commitlint runs in husky `commit-msg`; body lines must be ≤100 chars
- **Releases via semantic-release** — `.releaserc.json`; commits land on `main`, no manual version bumps
- **GitHub account** — push under `offendingcommit` (`gh auth switch` if needed)
- **Desktop preflight is local** — Rust/Tauri compile-check no longer runs in PR CI; run `pnpm --filter @openconcho/desktop cargo-check` before pushing any `packages/desktop/**` or `packages/desktop/src-tauri/**` change

## Pull Request evidence

Every PR body must answer:

1. **Intent** — what behaviour are you changing, and why?
2. **Risk** — what could break? Affected files, contracts, user journeys?
3. **Standards** — naming, architecture, complexity, security, error handling — anything notable?
4. **Test evidence** — which tests cover the change? What manual verification did you run?
5. **Out-of-scope** — what was intentionally left out and why?
6. **Architect focus** — what should the senior reviewer actually inspect manually?

**Screenshots are required** for any PR touching `packages/web/src/components/`, `packages/web/src/routes/`, or `packages/desktop/`. Commit them under `docs/screenshots/<feature-slug>/`, reference via `raw.githubusercontent.com` URLs in the PR body. See `.claude/rules/workflows.md` → "Open a PR" for the full screenshot capture + commit + reference pattern.

The structured template in `.github/PULL_REQUEST_TEMPLATE.md` pre-fills these sections — fill it in before clicking "Create pull request".
