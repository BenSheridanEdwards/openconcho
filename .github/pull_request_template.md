<!--
Required reading before filling this in:
- AGENTS.md → "Definition of Done"
- .claude/rules/workflows.md → "Open a PR"

Delete this comment block once your PR body is complete.
-->

## Why

<!-- The problem this solves, in 1–3 sentences. What pain or gap does this close? -->

## What

<!-- Bullet list of the changes. One bullet per file or per logical unit. -->

-
-

## Screenshots

<!--
REQUIRED if this PR touches `packages/web/src/components/`, `packages/web/src/routes/`,
or `packages/desktop/`. Commit images under `docs/screenshots/<feature-slug>/` and
reference via raw.githubusercontent.com URLs so they render before merge.

Example:
![Empty state](https://raw.githubusercontent.com/BenSheridanEdwards/openconcho/<branch>/docs/screenshots/<feature-slug>/01-empty.png)

Delete this section only if the PR is docs-only or backend-only with no UI surface.
-->

## QA checklist

- [ ] `pnpm typecheck` clean locally
- [ ] `pnpm lint` clean locally
- [ ] `pnpm test` green locally
- [ ] Manual verification: <!-- which Honcho instance you tested against, which workspace/peer, what you clicked, what you saw -->
- [ ] For desktop changes: `pnpm --filter @openconcho/desktop cargo-check` passes
- [ ] Worked in a git worktree (not the main checkout) — see `AGENTS.md` → "Worktree workflow"

## Out-of-scope

<!-- What was intentionally left out and why. Helps reviewers avoid asking for things you've already decided to defer. -->

## Notes

<!-- Caveats, follow-ups, anything reviewers should know. Linked follow-up issues go here. -->
