# Architecture diagram

High-level system map. Render in any Markdown viewer that supports Mermaid (GitHub does this natively).

## Component overview

```mermaid
flowchart LR
    subgraph User["User's machine"]
        direction TB

        subgraph Desktop["@openconcho/desktop (Tauri)"]
            TauriShell["Tauri shell (Rust)"]
            DiscoverCmd["discover_honcho_instances<br/>(localhost port scan)"]
            DeepLink["Deep-link handler<br/>openconcho://"]
            TauriShell --- DiscoverCmd
            TauriShell --- DeepLink
        end

        subgraph Web["@openconcho/web (React 19)"]
            direction TB
            Routes["TanStack Router<br/>(file-based routes)"]
            Queries["TanStack Query hooks<br/>(client.current + scoped)"]
            ApiClient["openapi-fetch client<br/>(typed from openapi.json)"]
            Config["lib/config.ts<br/>(localStorage instances)"]

            Routes --> Queries
            Queries --> ApiClient
            ApiClient --> Config
        end

        Desktop -- "bundles + hosts" --> Web
    end

    subgraph Fleet["Honcho instances (1..N)"]
        direction TB
        Neo["Neo: 127.0.0.1:8001"]
        Iris["Iris: 127.0.0.1:8002"]
        Lexi["Lexi: 127.0.0.1:8003"]
        Other["..."]
    end

    Web -- "HTTP /v3/*<br/>per active instance" --> Neo
    Web -- "Compare view fans out" --> Iris
    Web -- "Compare view fans out" --> Lexi
    DiscoverCmd -. "TCP probe /health" .-> Fleet

    Cloud["Honcho Cloud<br/>api.honcho.dev"]
    Web -. "optional alternative target" .-> Cloud
```

## Data flow

```mermaid
sequenceDiagram
    actor User
    participant Sidebar
    participant Config as lib/config.ts<br/>(localStorage)
    participant Client as api/client.ts<br/>(client.current)
    participant Honcho as Active Honcho instance

    User->>Sidebar: Switch instance
    Sidebar->>Config: setActiveInstance(id)
    Config->>Client: client.current re-reads config
    Note over Client: openapi-fetch client<br/>recreated with new<br/>baseUrl + token

    User->>Sidebar: Navigate to /workspaces
    Sidebar->>Client: useWorkspaces() hook
    Client->>Honcho: POST /v3/workspaces/list
    Honcho-->>Client: { items: [...] }
    Client-->>User: render workspace list
```

## External dependencies

| Dependency | Where it appears | Why it matters |
|---|---|---|
| Honcho REST API | All query hooks under `packages/web/src/api/` | Source of truth for memory data. Schema lives in `packages/web/openapi.json`. Regenerate types via `pnpm --filter @openconcho/web generate:api` after updating. |
| Honcho Cloud | `lib/config.ts:HONCHO_CLOUD_URL` | Hosted alternative to self-host. Sidebar marks it specially in `isCloudInstance()`. |
| Tauri v2 | `packages/desktop/src-tauri/` | Desktop shell. Native HTTP requests (no browser CORS), enables port-scan discovery. |
| Anthropic API | `.github/workflows/ai-review.yml` | AI PR reviewer. Requires `ANTHROPIC_API_KEY` repo secret. Read-only tool allowlist. |
| GitHub Actions | `.github/workflows/{ci,release,ai-review}.yml` | CI/CD shared truth. Dependabot updates the action pins weekly. |

## Multi-instance scoping (Phase 2 + Phase D feature stack)

The default path (`client.current`) reads the *active* instance from `localStorage`. The Compare view and AI/feature views that fan out across the fleet use `createScopedClient(instance)` from `packages/web/src/api/scopedClient.ts` to bind a query to a specific non-active instance. Query keys are scoped by instance ID (`["compare", inst.id, ...]`) to prevent cache collisions across instances.

```mermaid
flowchart TB
    Sidebar["Sidebar<br/>(active instance switcher)"]
    DefaultClient["api/client.ts<br/>client.current<br/>→ active instance"]
    ScopedFactory["api/scopedClient.ts<br/>createScopedClient(instance)"]
    Compare["Compare view<br/>N columns"]
    Fleet["Fleet view"]
    Discovery["Discovery panel"]

    Sidebar --> DefaultClient
    DefaultClient --> SingleAgent["Most views<br/>(Dashboard, Workspaces, Peers, Sessions)"]

    Compare --> ScopedFactory
    Fleet --> ScopedFactory
    Discovery --> ScopedFactory

    ScopedFactory --> Inst1["Neo client"]
    ScopedFactory --> Inst2["Iris client"]
    ScopedFactory --> InstN["..."]
```
