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
