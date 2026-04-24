# Architecture: openconcho

## Overview

Single-page application for browsing and interacting with a self-hosted [Honcho](https://github.com/plastic-labs/honcho) instance. Configurable at runtime — no URLs baked in.

Stack: React 19, Vite 8, TypeScript 6, TanStack Router v1, TanStack Query v5, Tailwind CSS v4, framer-motion, openapi-fetch.

## Key Components

| Component | Location | Responsibility |
|-----------|----------|---------------|
| API client | `src/api/client.ts` | openapi-fetch client, reads config from localStorage at call time |
| Query hooks | `src/api/queries.ts` | All TanStack Query hooks, typed via generated schema |
| Config | `src/lib/config.ts` | localStorage read/write, health check, Zod validation |
| Theme | `src/lib/theme.ts` | Dark/light theme via `data-theme` on `<html>` |
| Root route | `src/routes/__root.tsx` | Auth guard (redirect to /settings), Sidebar layout |
| Sidebar | `src/components/layout/Sidebar.tsx` | Nav with animated active indicator |
| Settings | `src/components/settings/SettingsForm.tsx` | Base URL + optional token, connection test |

## Data Flow

1. App boots → `__root.tsx` checks `localStorage` for config
2. No config → redirect to `/settings`
3. User saves URL (+ optional token) → `loadConfig()` returns it on every query
4. `client.current` getter recreates the openapi-fetch client on each call, always picking up latest config
5. TanStack Query caches responses; stale time 30s, retries 1x

## External Dependencies

- Honcho REST API — described by `openapi.json` (local copy, regenerate with `pnpm generate:api`)
- No external auth provider — token is optional, detected via health check

## Design Decisions

<!-- Format: **YYYY-MM-DD**: Decision — Rationale -->

**2026-04-24**: Use CSS custom properties instead of Tailwind color tokens — enables instant dark/light switch via `data-theme` attribute without JS class manipulation per element.

**2026-04-24**: `client.current` getter pattern instead of module-level singleton — config can change at runtime (user updates settings) without requiring page reload.

**2026-04-24**: TanStack Router flat-route syntax — required by v1 Vite plugin; `params` cast as `as never` at callsites to satisfy the union type constraint without widening the app's own types.

**2026-04-24**: Token is optional — self-hosted Honcho instances may not require auth; `checkConnection()` probes the API to detect whether a 401 is returned, then surfaces the result in the settings form.
