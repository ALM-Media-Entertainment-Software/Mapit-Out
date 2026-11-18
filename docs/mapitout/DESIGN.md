# Map It Out - AI backend design (v0.2)

## Purpose
Map It Out (**Mapit Estimating**) is the diagramming/mapping front end of an AI-assisted mapping and
estimating product. This repo is a fork of draw.io (Apache 2.0) maintained under the Enterprise
organization (`ALM-Media-Entertainment-Software`) for three reasons (see [ADR 0009](adr/0009-apache2-commercial-fork-telemetry-sovereignty-and-rebrand.md)):
1. **Telemetry sovereignty:** never give away usage, error, prompt, or diagram telemetry to upstream (`draw.io` / `diagrams.net`) or third-party cloud services.
2. **First-party telemetry capture:** capture editor events, AI interactions, and estimating/quoting workflows for our own analytics, agent context, and security monitoring.
3. **Commercialization under Apache 2.0:** build and commercialize our own branded product (**Map It Out** / **Mapit Estimating**) while honoring Apache 2.0 attribution and stripping all `draw.io` trademarks.

Users describe or attach a diagram and a **local LLM** (LM Studio, including local Gemma/coding models) creates
or updates it. Later: agents drive it (see Roadmap).

## Architecture
```
Browser (mapitout.html)
  mapitout/env.js     -> window.MAPITOUT_LLM / window.MAPITOUT_TELEMETRY_CONFIG
  mapitout/config.js  -> window.MAPITOUT_CONFIG + outbound lockdown + runtime branding + window.MAPITOUT_TELEMETRY
  js/PreConfig.js     -> DRAWIO_CONFIG = MAPITOUT_CONFIG   (draw.io's override hook)
  Editor.configure()  -> aiConfigs / aiModels / enableAi + runtime hook (appName, logoImage, telemetry interceptors)
  AI chat dialog  --POST /v1/chat/completions-->  LM Studio (localhost:1234)
  Telemetry hook  --CustomEvent('mapitout:telemetry')-->  In-memory ring buffer / prompt-injection detector / HTTP sink (OPEN)
```
- Request/response shape is OpenAI-compatible (draw.io's built-in `gpt` config slot,
  response path `$.choices[0].message.content`). `config.js` overrides: `gptUrl`,
  `gptApiKey` (placeholder), `aiModels`, `aiActions`, `enableAi` (true, since AI is
  otherwise only on draw.io's own domains) and `settingsName`.
- `createPublic` is removed from `aiActions`, and cloud models are removed from
  `aiModels`, so no prompt or diagram leaves the machine by default.
- **Outbound telemetry & service lockdown (ADR 0009):** `config.js` and `js/PreConfig.js` neutralize all upstream `draw.io` / `diagrams.net` endpoints (`DRAWIO_LOG_URL = ''`, `EXPORT_URL = null`, `VSS_CONVERT_URL = null`, `PLANT_URL = null`, `NOTIFICATIONS_URL = null`, `ICONSEARCH_PATH = null`, `ICON_SERVICE_PATH = null`, local-origin `DRAWIO_BASE_URL` / `DRAWIO_LIGHTBOX_URL`, `Editor.enableRealtimeCache = false`, `EditorUi.enableLogging = false`).
- **First-party telemetry capture (`window.MAPITOUT_TELEMETRY`):** `config.js` wraps `EditorUi.logEvent`, `EditorUi.logError`, `EditorUi.sendReport`, and `EditorUi.debug` (`EditorUi.ChatWindow.send` / `EditorUi.ChatWindow.response`) to record sanitized events in memory (`window.MAPITOUT_TELEMETRY.events`), emit `CustomEvent('mapitout:telemetry')` on `window`, and optionally forward JSON or HTML summaries over HTTP when `window.MAPITOUT_TELEMETRY_CONFIG.endpoint` is set in `mapitout/env.js`. **OPEN:** the downstream telemetry sink destination and control-plane wire-up (JSON and/or HTML over HTTP once the monorepo is consolidated).
- **Prompt-injection listener/detector & Gemma model consolidation (OPEN):** a local Gemma model and a prompt-injection listener/detector (currently on the owner's personal repo) are planned to be migrated into the Enterprise repo (`ALM-Media-Entertainment-Software`) and attached to the telemetry/AI listener pipeline.
- Zero edits to draw.io core, except `js/PreConfig.js` (re-applies config, warns if missing). `config.js` also sets `DRAWIO_CONFIG` itself because `bootstrap.js` skips `PreConfig.js` on `*.draw.io`/`*.diagrams.net` hosts.
- Deploy overrides go in `mapitout/env.js` (committed empty; no secrets, it is public to visitors).
- **Model id must match LM Studio**: `local-model` is a placeholder; set the real id from `GET /v1/models` in `env.js` (console warning otherwise).

## Config (`window.MAPITOUT_LLM` and `window.MAPITOUT_TELEMETRY_CONFIG`, set in `mapitout/env.js`)
| object / key | default | note |
|---|---|---|
| `MAPITOUT_LLM.baseUrl` | `http://localhost:1234/v1` | LM Studio server |
| `MAPITOUT_LLM.models` | `[{name, model}]` | `model` = id from `GET {baseUrl}/models` (e.g. local Gemma model) |
| `MAPITOUT_LLM.apiKey` | `lm-studio` | placeholder; draw.io hides models with no key |
| `MAPITOUT_TELEMETRY_CONFIG.enabled` | `true` | captures first-party events in `window.MAPITOUT_TELEMETRY` |
| `MAPITOUT_TELEMETRY_CONFIG.endpoint` | `null` (**OPEN**) | optional HTTP sink URL for JSON / HTML telemetry payloads |
| `MAPITOUT_TELEMETRY_CONFIG.format` | `'json'` (**OPEN**) | `'json'` or `'html'` payload format when `endpoint` is set |

## Agent-agnostic principle (decided)
Map It Out is a tool any LLM or agent can use - LM Studio models, Claude, others -
not a feature tied to one provider. Two integration surfaces, one tool contract:
1. **Model backend** (built): `aiConfigs`/`aiModels` - the in-app chat calls any
   OpenAI-compatible endpoint. Add a model = add an entry.
2. **Agent tool surface** (design, not built): draw.io's embed message API
   (`EditorUi.js` handles `load`, `merge`, `export`, `layout`, `template`, `dialog`,
   `status` actions via postMessage) lets an agent read/write the live canvas
   in the app, no model API needed. Plan: one thin tool contract
   (`get_diagram`, `apply_xml`/`merge`, `layout`, `export`) exposed as
   (a) window postMessage, (b) an MCP server bridge for Claude Code and others.
   Product-side API comes later and wraps the same contract.

## Related work: diagram-design (cathrynlavery/diagram-design, MIT)
Skill/plugin that generates presentation-grade static HTML/SVG diagrams (47 types)
and redraws draw.io/Mermaid/Excalidraw files. Decision: **do not vendor into this
fork**. It outputs read-only artifacts, not editable draw.io XML, and is large
(screenshots, icon vendor dir, ~40 verify scripts). Use it as a separate installed
skill for agents; revisit a thin "export to editorial" action later. MIT permits
reuse with the copyright notice kept.

## Product context and direction (from owner, 2026-10-04, updated 2026-11-16)
Captured as stated; items marked **OPEN** are not decided.

**Positioning & Commercialization.** Map It Out (**Mapit Estimating**) is built on the Apache 2.0
version of draw.io so we retain full ownership of our telemetry and can commercialize the product.
Today it serves as a **developer tool** (flow diagrams, architecture maps, design-first documentation)
and is growing the **Map It Quick Quote / Mapit Estimating** feature. Whether that becomes its own
product later is **OPEN**; for now it is one codebase/business structure (consolidating into the
Enterprise repo and future monorepo), kept easy to split.

**Map It Quick Quote (feature concept, not built).**
- Voice-first: the user talks through a job; the system drafts a quick diagram plus quote.
- Photos and measurements the user adds feed the drawing and the estimate.
- Output is shown to the user first, then passed to their client (manual send, or
  automatic send as an option - **OPEN**).
- Early target trade: electrical design (circuits, sockets, rooms/floorplan layouts).
  draw.io room/floorplan shapes and socket symbols cover the drawing side.
- **OPEN**: voice stack (local STT vs hosted), pricing/rates source, where quotes are
  stored and sent from, measurement units/accuracy rules, client-facing format.

**Multi-model, shared-context orchestration (design intent).**
- Local models (LM Studio, including Gemma) and frontier models (Claude, Gemini, others) all work against
  the same tool contract (see Agent-agnostic principle) and the same project record.
- An orchestrator agent (Claude is the intended one, **OPEN**) delegates to local
  models/agents. Frontier models run on separate, scoped tasks, not mixed into one thread.
- Every participant must see what the others did: a shared **activity/context ledger**
  (who, which model, which task, inputs, outputs, diagram version) that any agent can
  read before acting. This includes work done in LM Studio, so LM Studio sessions need
  to write to (or be readable by) the ledger. **Decided (ADR 0004): append-only JSONL in git,
  one file per writer; core built** - see [ledger design](ledger/DESIGN.md). How LM Studio
  writes to it: the MCP adapter is built (`docs/mapitout/ledger/MCP.md`) but untested with a real LM Studio; the logging proxy is deferred.
- **Enterprise repo consolidation & prompt-injection detection (OPEN):** migrate the Gemma model setup and prompt-injection listener/detector from the personal repo into the Enterprise repo (`ALM-Media-Entertainment-Software`), and wire telemetry into the control plane once the monorepo is ready.
- **Headless-first**: the tool contract works with no UI; UIs sit on top. Candidate
  front ends: this editor, Open WebUI (**OPEN**). Gemini is a candidate for Google
  Workspace tasks only. Using fewer frontier models is fine; add one only when a
  use case justifies it.

**Design-first rule (owner).** Architecture, SDLC/DevOps, APIs, agent/skill workflows and
documentation are designed and written before code, with reliability, security and
maintainability measured up front. New features land as design docs/ADRs first.

## Decisions and further design
- ADRs: [`adr/`](adr/README.md) (0001 design-first, 0002 configure not patch, 0003 agnostic tool contract,
  0004 ledger, 0005 diagram-design, 0006 Quick Quote, 0007 session memory, 0008 MCP adapter, 0009 Apache 2.0 commercial fork, telemetry sovereignty & rebrand).
- Shared activity ledger: [`ledger/DESIGN.md`](ledger/DESIGN.md) and [`ledger/MCP.md`](ledger/MCP.md) (built: library, CLI, MCP stdio server, schema, tests, CI).
- Cross-device session memory: [`memory/DESIGN.md`](memory/DESIGN.md) and [`memory/PROMPTS.md`](memory/PROMPTS.md) (phase 1 built: `tools/memory/memnote.mjs`).

## Constraints / risks
- **CORS**: LM Studio server must have CORS enabled when the page is served from
  another origin. **Mixed content**: modern browsers allow an https page to fetch
  http://localhost (a potentially trustworthy origin since Mixed Content Level 2); the
  block applies to non-local hosts, e.g. LM Studio's LAN IP - serve over plain http
  locally or put a TLS reverse proxy in front.
- **Saved-config isolation**: `settingsName: 'mapitout'` moves browser-saved config/settings to `.mapitout-*` keys, so a stock draw.io `.configuration` on the same origin cannot restore a cloud AI endpoint/key/model. Verified with a hostile saved config.
- **Key handling**: the key slot is shared with draw.io's `gpt` config, so a real
  OpenAI key set via `gptApiKey` would be sent to the LM Studio URL. Keep it a placeholder.
- **Trademark & Apache 2.0 compliance**: README forbids using/modifying the draw.io name or logo for our
  product, and forbids using bundled icons/stencils in Atlassian Marketplace products. `mapitout.html`,
  `mapitout/logo.svg`, `mapitout/mapit-estimating.png`, and runtime overrides in `mapitout/config.js`
  (`Editor.prototype.appName = 'Map It Out'`, `Editor.logoImage`) rebrand both the entry screen and the
  in-app header/window title to **Map It Out / Mapit Estimating** while preserving Apache 2.0 copyright
  headers in source files.

## Roadmap (not built)
1. Wire first-party telemetry (`window.MAPITOUT_TELEMETRY`) to the monorepo control-plane sink (JSON / HTML over HTTP - **OPEN**).
2. Migrate the Gemma model config and prompt-injection listener/detector from the personal repo to the Enterprise repo (**OPEN**).
3. Estimating layer: quantity/cost attributes on shapes, export to estimate sheet.
4. Agents/skills calling the same LM Studio endpoint (or an agent gateway) headlessly.
5. Tests: config-contract test (Playwright) in CI.

## Run locally
```
cd src/main/webapp && python3 -m http.server 8080
# open http://localhost:8080/mapitout.html ; start LM Studio server (port 1234)
```
