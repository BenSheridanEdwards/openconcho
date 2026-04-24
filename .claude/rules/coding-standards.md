---
description: Coding conventions — read when writing or reviewing any code file
---

# Coding Standards

## DO
- Use TypeScript strict mode (`"strict": true` in tsconfig)
- Use Zod only at user-input boundaries (settings form) — not for internal types
- Use named constants — never magic numbers or strings
- Keep components focused; co-locate sub-components in the same file if < 80 lines
- Use `type` imports for framer-motion's `Variants` type to avoid widening issues
- Cast TanStack Router `params` as `as never` for cross-route navigation

## NEVER
- Use `any` — use `unknown` and narrow explicitly
- Inline Honcho base URL — always read from `loadConfig()` in `src/lib/config.ts`
- Use Tailwind color classes for theme-sensitive values — use CSS `var(--*)` instead
- Use `React.FormEvent` (deprecated in TS6) — use `React.SyntheticEvent<HTMLFormElement>`
- Add `as const` to framer-motion variant objects — annotate with `const x: Variants = {}`

## Test Standards
- One assertion per test case
- Test behavior, not implementation
- Run targeted: `pnpm vitest run src/path/to/file.test.ts`
- Never mock internal modules — mock only external API boundaries (openapi-fetch client)

## API Query Patterns
- All data fetching via TanStack Query hooks in `src/api/queries.ts`
- POST body shapes are fixed per the openapi schema — do not guess field names
- Use `client.current` (getter) to always get fresh config at call time
