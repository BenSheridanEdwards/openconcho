# openconcho

Frontend UI for self-hosted Honcho instances — browse memories, peers, sessions, conclusions, and chat with memory context.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start Vite dev server (http://localhost:5173) |
| `pnpm build` | Production build to `dist/` |
| `pnpm lint` | Biome lint check |
| `pnpm lint:fix` | Biome lint + auto-fix |
| `pnpm format` | Biome format check |
| `pnpm test` | Run Vitest tests |
| `pnpm generate:api` | Regenerate `src/api/schema.d.ts` from `openapi.json` |

## Structure

| Path | Purpose |
|------|---------|
| `src/routes/` | TanStack Router file-based routes (flat-route syntax) |
| `src/components/` | Feature components grouped by domain |
| `src/api/` | openapi-fetch client + TanStack Query hooks |
| `src/lib/` | Config (localStorage) + theme utilities |
| `src/hooks/` | Custom React hooks |
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
