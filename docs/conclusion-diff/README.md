# Conclusion Diff — screenshots

Three reference screenshots embedded in the PR. To regenerate after a UI change:

```bash
# In one shell:
pnpm --filter @openconcho/web dev

# In another:
node docs/conclusion-diff/capture.mjs
```

The capture script stubs the Honcho API at the network layer with `page.route`, so no real backend is required. It depends on `@playwright/test`, which is already a workspace dep.

| File                      | What it shows                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `01-empty-state.png`      | Empty state with the date pickers, peer filter inputs, and preset buttons (dark theme).  |
| `02-populated-diff.png`   | Three-column diff with Added (3), Modified (1, before/after), and Removed (0) in dark.   |
| `03-populated-light.png`  | Same dataset as #2, rendered in the light theme.                                          |

The Modified card stacks the before/after content with red/green semantic backgrounds, mirroring the Removed/Added column colors so a reader can tell at a glance which side is which.
