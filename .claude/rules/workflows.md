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
