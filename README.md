# Honcho UI

A clean, fast frontend for browsing and chatting with a self-hosted [Honcho](https://github.com/plastic-labs/honcho) instance.

> **Privacy-first**: all connection details (base URL, optional token) are stored locally in your browser — never sent anywhere except directly to your Honcho instance.

---

## Features

- **Dashboard** — workspace count and queue status at a glance, auto-refreshes every 10 s
- **Workspaces** — paginated list with per-workspace navigation
- **Peers** — browse peers, view representations, context, and peer cards
- **Sessions** — paginated message history with summaries and context
- **Conclusions** — semantic search across conclusions with observer/subject display
- **Chat** — conversational interface that sends messages through Honcho's chat endpoint with memory context
- **Dark / light mode** — persisted per browser, instant toggle
- **Optional auth** — token field is optional; a connection health check auto-detects whether auth is required

## Quick Start

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- A running Honcho instance (local or remote)

### Install & run

```bash
git clone https://github.com/offendingcommit/openconcho.git
cd openconcho
pnpm install
pnpm dev
```

Open http://localhost:5173 — you'll be prompted to enter your Honcho URL.

### Connect to your instance

1. Enter the base URL of your Honcho instance (e.g. `http://localhost:8000`)
2. Optionally enter an API token if your instance requires auth
3. Click **Test connection** — the UI will tell you if auth is needed
4. Click **Save** — you're in

### Build for production

```bash
pnpm build
# Output in dist/ — serve with any static host
```

## Stack

| Layer | Library |
|-------|---------|
| Framework | React 19 + Vite 8 |
| Routing | TanStack Router v1 (file-based) |
| Data fetching | TanStack Query v5 |
| API client | openapi-fetch (typed from `openapi.json`) |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Animation | framer-motion |
| Icons | lucide-react |
| Lint / format | Biome |
| Tests | Vitest + Testing Library |

## Development

```bash
pnpm dev          # dev server with HMR
pnpm lint:fix     # Biome lint + format
pnpm test         # run tests
pnpm generate:api # regenerate src/api/schema.d.ts from openapi.json
```

## Regenerating API types

If your Honcho instance is updated, grab a fresh `openapi.json` and run:

```bash
curl http://your-honcho-url/openapi.json -o openapi.json
pnpm generate:api
```

## Privacy

- Base URL and token are stored in `localStorage` under `openconcho:config`
- Theme preference is stored in `localStorage` under `openconcho:theme`
- No telemetry, no analytics, no external requests beyond your configured Honcho instance

## Contributing

Issues and PRs welcome. Open an issue first for significant changes.

## License

MIT
