# Core user flows

The main journeys through openconcho. Each diagram is Mermaid (renders inline on GitHub) plus a short narrative.

## 1. First launch — auto-discover and add fleet

The killer first-run flow on the desktop build.

```mermaid
sequenceDiagram
    actor User
    participant App as OpenConcho .app<br/>(Tauri)
    participant Discovery as discover.rs<br/>(Rust)
    participant Honchos as Honcho instances<br/>:8000-:8100
    participant LS as localStorage<br/>(openconcho:instances)

    User->>App: Launch (no instances configured)
    App->>App: Render Settings + DiscoveredInstances<br/>(autoRun=true)
    App->>Discovery: invoke("discover_honcho_instances")
    Discovery->>Honchos: TCP connect + GET /health<br/>across all 101 ports (parallel)
    Honchos-->>Discovery: 5 ports respond {"status":"ok"}
    Discovery-->>App: [{port: 8001, base_url: ...}, ...]

    loop For each discovered instance
        App->>Honchos: POST /v3/workspaces/list (limit=1)
        Honchos-->>App: { items: [{ id: "neo-personal" }] }
        App->>App: Derive name: "Neo" from "neo-personal"
    end

    App-->>User: Render 5 rows: ✓ Neo / ✓ Iris / ✓ Lexi / ✓ DiVinci / ✓ Jeeves<br/>(all pre-checked)
    User->>App: Click "Add 5 instances"
    App->>LS: saveStore({ instances: [...], activeId: <Neo's id> })
    App-->>User: Navigate to /dashboard with Neo active
```

## 2. Compare peer representations across the fleet

The Compare view answers "how does my agent fleet's model of *me* differ across agents?"

```mermaid
sequenceDiagram
    actor User
    participant Compare as CompareView
    participant Column as CompareColumn<br/>(one per instance)
    participant Scoped as createScopedClient(instance)
    participant Honcho as Per-instance Honcho

    User->>Compare: Navigate to /compare?instances=neo,iris,lexi&peer=ben

    Compare->>Compare: Parse search params<br/>→ selectedIds, targetPeerName

    par For each selected instance
        Compare->>Column: <CompareColumn instance={inst} targetPeerName="ben" />
        Column->>Scoped: createScopedClient(instance)
        Scoped->>Honcho: POST /v3/workspaces/list
        Honcho-->>Column: { items: [{ id: "<agent>-<camp>" }] }
        Column->>Column: Auto-select first workspace
        Column->>Scoped: POST /workspaces/{ws}/peers/list
        Scoped->>Honcho: ...
        Honcho-->>Column: { items: [{ id: "ben" }, ...] }
        Column->>Column: Auto-select peer matching targetPeerName "ben"<br/>(or first peer)
        Column->>Scoped: POST /peers/ben/representation
        Column->>Scoped: GET /peers/ben/card
        Honcho-->>Column: representation + card
        Column-->>User: Render column<br/>(conclusions list + PeerCardViewer)
    end
```

## 3. Active-instance scoped browsing (Dashboard / Workspaces / Peers / Sessions)

The default path. Most of the existing app.

```mermaid
sequenceDiagram
    actor User
    participant Sidebar
    participant Route as Route component<br/>(Dashboard / Workspaces / etc.)
    participant Hook as useWorkspaces() etc.
    participant Client as client.current
    participant Honcho as Active Honcho instance

    User->>Sidebar: Click instance switcher → pick "Iris"
    Sidebar->>Sidebar: setActiveInstance(iris.id)
    Note over Client: client.current getter<br/>re-reads localStorage<br/>→ Iris's baseUrl + token

    User->>Route: Navigate to /dashboard
    Route->>Hook: useWorkspaces()
    Hook->>Client: client.current.POST("/v3/workspaces/list", ...)
    Client->>Honcho: Iris's API
    Honcho-->>Hook: { items: [{ id: "iris-personal" }] }
    Hook-->>Route: data
    Route-->>User: Render Iris's workspace list
```

Note: this is why **Dashboard only shows one workspace at a time** — it's scoped to the active instance by design. The Compare view (#2) and Fleet Dashboard (planned) are the multi-instance views.

## 4. Connection health detection

How `<HealthDot />` and the settings form know whether a configured instance is reachable.

```mermaid
flowchart TB
    Start([Settings form: Test connection])
    Start --> Probe[POST /v3/workspaces/list<br/>5s timeout]
    Probe -->|200 OK| OK[status: "ok"<br/>Connected]
    Probe -->|401 or 403| Auth[status: "auth-required"<br/>Show token field]
    Probe -->|other 4xx/5xx| Unreach[status: "unreachable"<br/>Server returned X]
    Probe -->|timeout / network| Down[status: "unreachable"<br/>Cannot reach server]

    OK --> Save[Save instance to localStorage]
    Auth --> Token{User provides token?}
    Token -->|yes| Probe
    Token -->|no| Save
```

## 5. Dream consolidation (read-side surfacing)

Currently a black box — Phase 9 spawn-task "Live dream progress viewer" (PR #10) is closing this. Documented here so the architectural intent is in writing.

```mermaid
sequenceDiagram
    participant Cron as Honcho dream scheduler<br/>(every 8h per agent)
    participant Dreamer as Dreamer worker<br/>(off-queue)
    participant Conclusions as Per-peer conclusions
    participant Card as Peer card
    participant App as openconcho UI

    Cron->>Dreamer: process_dream(workspace, peer)
    Dreamer->>Conclusions: read recent observations
    Dreamer->>Dreamer: DeductionSpecialist<br/>→ create_observations_deductive
    Dreamer->>Dreamer: InductionSpecialist<br/>→ create_observations_inductive
    Dreamer->>Card: update_peer_card

    Note over App: Next render of the peer<br/>shows new conclusions<br/>+ updated card

    App->>App: useQueueStatus polls /queue/status<br/>(10s; Phase 7 chip will adapt to 2-3s<br/>when dreams active)
```
