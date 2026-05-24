# Test map

Behaviour-named, not file-named — what's actually covered by the test suite. Updated as new tests land.

Each row names a behaviour, then the file(s) that test it. When the row is missing or starred (★), that's a known coverage gap.

## Connection config + instance management

| Behaviour | Tests |
|---|---|
| First load with no config redirects to settings | `src/test/app.test.tsx` |
| Settings form validates URL + saves to localStorage | `src/test/settings-form.test.tsx` |
| Connection health check classifies 200/401/403/timeout correctly | `src/test/health-status.test.tsx` |
| Multi-instance migration: legacy `openconcho:config` → `openconcho:instances` | ★ (covered indirectly by `loadStore()` integration; no direct test) |
| Adding an instance assigns a UUID and activates it if no active set | ★ |
| Switching active instance clears react-query cache | ★ |

## API client patterns

| Behaviour | Tests |
|---|---|
| Scoped client targets the instance's baseUrl | `src/test/scoped-client.test.ts` |
| Scoped client attaches Bearer token from instance.token | `src/test/scoped-client.test.ts` |
| `client.current` re-reads localStorage on every call (no caching of stale config) | ★ |

## Discovery (Tauri-only)

| Behaviour | Tests |
|---|---|
| `deriveNameFromWorkspaceId` handles hyphenated, multi-segment, no-hyphen IDs | `src/test/discovery.test.ts` |
| Rust `discover_honcho_instances` rejects inverted port ranges | `packages/desktop/src-tauri/src/discover.rs` (#[test]) |
| Rust probe ignores ports with no listener | `packages/desktop/src-tauri/src/discover.rs` (#[test]) |
| Rust probe finds all 5 live Hermes stacks on 8001-8005 | `packages/desktop/src-tauri/src/discover.rs` (`#[ignore]`d — opt-in via `cargo test -- --ignored`) |
| `suggestNameForInstance` falls back to `Honcho :<port>` when no workspaces | ★ |
| DiscoveredInstances component renders no-instances state when scan returns empty | ★ |
| DiscoveredInstances "Add N" persists all selected to localStorage | ★ |

## Compare view (cross-instance)

| Behaviour | Tests |
|---|---|
| Compare route renders empty state when no instances selected via search params | `src/test/compare.test.tsx` |
| Compare column auto-selects first workspace once loaded | ★ |
| Compare column auto-selects peer matching `targetPeerName` if present | ★ |
| Compare column falls back to first peer when target doesn't exist | ★ |
| Removing a column updates the URL `instances` search param | ★ |

## Coding standards (enforced by lint/typecheck, not tests)

These are policy-level, checked by Biome + TypeScript + the AI reviewer rather than unit tests:

- No `any` (TS strict)
- No hardcoded URLs — config from `loadConfig()`
- CSS variables for theme colors
- Conventional commits (commitlint pre-commit hook)
- TanStack Router params cast `as never`
- One assertion per test (style rule)

## Coverage thresholds (Phase B)

Configured in `packages/web/vitest.config.ts`:

| Metric | Floor |
|---|---|
| Lines | 25% |
| Functions | 25% |
| Branches | 50% |
| Statements | 25% |

These are starting floors. The intent is to ratchet up as coverage grows — drop below them and CI fails. See `docs/risks.md` for the open risks around current coverage being thin in several areas.

## Known coverage gaps (priority order)

1. **Instance management hooks** (`useInstances` hook — add/update/remove/activate flows) — high-traffic code, no direct tests
2. **Scoped queries** (`compareQueries.ts`) — key generation per-instance, enabled-flag behaviour
3. **DiscoveredInstances component** — graceful degradation when not in Tauri, post-scan UI states
4. **Settings form auth-required flow** — covers the 401 → "show token field" transition
5. **Sidebar instance switcher** — activate flow, cache clear, dropdown behaviour

When you add tests for any of these, update this map. The bar is **behaviour described in human language**, not "test file foo.test.ts exists."
