---
description: Recurring task patterns — read when fixing issues, adding features, or running tests
---

# Workflows

## Add a Feature

1. Read `docs/architecture.md` to understand where new code belongs
2. Write the test first (failing)
3. Implement minimum code to pass
4. `pnpm test` — full suite
5. `pnpm lint:fix` — Biome
6. Commit: `feat: <description>`

## Fix a Bug

1. Grep codebase for identifiers mentioned in the bug report
2. Read the 2–3 most relevant files
3. Write a failing test that reproduces the problem
4. Implement the minimal fix
5. `pnpm vitest run <path/to/test.ts>` — verify test passes
6. `pnpm lint:fix` — pass lint
7. Commit: `fix: <description>`

## Regenerate API Types

Run after updating `openapi.json`:

```bash
pnpm generate:api
# → overwrites src/api/schema.d.ts
# Do not edit schema.d.ts manually
```

## Run Targeted Tests

```bash
pnpm vitest run src/path/to/file.test.ts
pnpm vitest run --testNamePattern="<substring>"
pnpm vitest src/path/to/file.test.ts  # watch mode
```

## Add a New Route

1. Create `src/routes/<flat-route-name>.tsx` using TanStack Router flat-route syntax
2. Export `const Route = createFileRoute("/<path>")({ component: Foo })`
3. Vite plugin auto-regenerates `src/routeTree.gen.ts` on save
4. Add nav link to `src/components/layout/Sidebar.tsx` if top-level
5. Cast all `navigate()` / `<Link>` params as `as never`

## Open a PR

**Every PR that adds or changes UI must include at least one screenshot in the body** — visual proof the change works against a real Honcho instance. Text descriptions of "what should be seen" are insufficient. See `AGENTS.md` → "Definition of Done" for the full bar.

### Take screenshots

For web-only features (most): run `pnpm dev:web` and use the Claude Preview tool's `preview_screenshot` — works without Screen Recording permission, returns a PNG directly. Set up instances in `localStorage` via `preview_eval` if needed.

For Tauri-only features (port-scan discovery, native-window-specific): build with `pnpm --filter @openconcho/desktop build`, `open packages/desktop/src-tauri/target/release/bundle/macos/OpenConcho.app`, then `screencapture -x -o /tmp/<feature>.png` (requires Screen Recording permission granted to the controlling process).

### Commit screenshots into the branch

Place under `docs/screenshots/<feature-slug>/`:

```
docs/screenshots/
└── compare-view/
    ├── 01-empty.png
    ├── 02-five-columns.png
    └── 03-diff-highlight.png
```

`git add docs/screenshots/<feature-slug>/`, then commit either as a separate `docs: add screenshots for <feature>` commit or amend into the feature commit if the PR is single-commit.

### Reference in the PR body

Use absolute `raw.githubusercontent.com` URLs so they render even before the branch is merged:

```markdown
## Screenshots

### Empty state
![Empty state](https://raw.githubusercontent.com/BenSheridanEdwards/openconcho/<branch-name>/docs/screenshots/<feature-slug>/01-empty.png)

### Five columns rendering live data
![Five columns](https://raw.githubusercontent.com/BenSheridanEdwards/openconcho/<branch-name>/docs/screenshots/<feature-slug>/02-five-columns.png)
```

Replace `<branch-name>` with the actual branch (e.g. `feat/dream-output-viewer`). The screenshots resolve as soon as you push.

### Required PR body sections

Every PR body answers these in order (the template at `.github/PULL_REQUEST_TEMPLATE.md` pre-fills them):

1. **Why** — the problem this solves, in 1–3 sentences
2. **What** — bullet list of changes
3. **Screenshots** — at least one per user-facing surface added or changed (UI PRs only)
4. **QA checklist** — `pnpm typecheck`, `pnpm lint`, `pnpm test`, and the specific manual verification you did (which Honcho instance you tested against, which workspace/peer, what you clicked, what you saw)
5. **Out-of-scope** — what was intentionally left out and why
6. **Notes** — caveats, follow-ups, anything reviewers should know

### Worktree reminder

Before opening the PR, confirm you've been working in a worktree (`git worktree list` should show your feature branch in a separate path). If you've accidentally committed on `main` in the primary checkout, reset and redo in a worktree — see `AGENTS.md` → "Worktree workflow".
