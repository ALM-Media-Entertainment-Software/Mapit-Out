# ADR 0009 - Apache 2.0 commercial fork, first-party telemetry sovereignty, and Mapit Estimating rebrand
Status: accepted      Date: 2026-11-16

## Context
We forked the Apache 2.0 version of draw.io so that:
1. We do not leak or give away product, usage, diagram, or AI telemetry to upstream (`draw.io` / `diagrams.net`) or third-party cloud endpoints.
2. We capture telemetry for our own use cases (editor actions, AI prompt/response turns, error diagnostics, and estimating/quoting workflows) to feed our own control plane, evaluation, and multi-agent context.
3. We can commercialize the product (**Map It Out** / **Mapit Estimating**) under the permissive Apache 2.0 license while complying with its attribution and trademark rules (no `draw.io` name or logo in our product, and no distribution of upstream stencil/icon assets in the Atlassian Marketplace).
4. The owner is consolidating personal repositories (including a local **Gemma model** configuration and a **prompt-injection listener/detector**) into the Enterprise repository (`ALM-Media-Entertainment-Software`) and future monorepo control plane.

## Decision
1. **Outbound telemetry and cloud service lockdown:** In `mapitout/config.js` and `js/PreConfig.js` (keeping ADR 0002's zero-core-patch rule), neutralize all default upstream endpoints (`DRAWIO_LOG_URL = ''`, `EXPORT_URL = null`, `VSS_CONVERT_URL = null`, `PLANT_URL = null`, `NOTIFICATIONS_URL = null`, `ICONSEARCH_PATH = null`, `ICON_SERVICE_PATH = null`, `DRAWIO_BASE_URL` and `DRAWIO_LIGHTBOX_URL` scoped to local origin, `Editor.enableRealtimeCache = false`, and `EditorUi.enableLogging = false`).
2. **First-party telemetry capture (`window.MAPITOUT_TELEMETRY`):** Intercept `EditorUi.logEvent`, `EditorUi.logError`, `EditorUi.sendReport`, and `EditorUi.debug` (`EditorUi.ChatWindow.send` / `EditorUi.ChatWindow.response`) inside `mapitout/config.js`. Store sanitized structured events in a bounded in-memory ring buffer, emit a `CustomEvent('mapitout:telemetry', {detail: event})` on `window` for in-process listeners (such as the planned prompt-injection listener/detector), and optionally forward payloads (JSON and/or HTML summary over HTTP) when `window.MAPITOUT_TELEMETRY_CONFIG.endpoint` is set in `mapitout/env.js`. Keep the downstream telemetry sink destination **OPEN** until the monorepo control plane is wired up.
3. **Commercial rebrand (`Mapit Estimating` / `Map It Out`):** Replace the placeholder entry mark with the official **Mapit Estimating (`ME`)** logo (`mapitout/mapit-estimating.png` and `mapitout/logo.svg`) and override `Editor.prototype.appName = 'Map It Out'` and `Editor.logoImage` at runtime via `mapitout/config.js` so neither the window title nor the in-app header displays `draw.io` branding.

## Alternatives
- Leave upstream `Init.js` / `EditorUi.js` defaults in place: rejected, risks leaking error beacons (`log.draw.io` / `log.diagrams.net`), remote export payloads (`convert.diagrams.net`), or realtime cache traffic (`app.diagrams.net`).
- Patch `Editor.js` and `EditorUi.js` directly and rebuild `app.min.js`: rejected per ADR 0002; runtime hooks in `mapitout/config.js` apply identically to both `app.min.js` and `?dev=1` without upstream merge pain.
- Hardcode a fixed telemetry backend now: rejected; the downstream control plane and monorepo layout are still being consolidated (**OPEN**).

## Consequences
- Zero telemetry, diagrams, or prompts are sent to upstream `draw.io` / `diagrams.net` servers.
- First-party usage, error, and AI turn events are captured locally (`window.MAPITOUT_TELEMETRY`) and broadcast via `mapitout:telemetry` DOM events so a prompt-injection listener/detector or HTTP forwarder can subscribe without modifying editor code.
- Entry page, in-app top-left icon, and browser window title are rebranded to **Map It Out / Mapit Estimating**, satisfying the draw.io trademark requirement for commercial use while preserving Apache 2.0 copyright notices in source files.
- **OPEN:** Downstream telemetry sink destination and wire format (JSON and/or HTML over HTTP into the control plane once the monorepo is completed).
- **OPEN:** Migrating the Gemma model setup and the prompt-injection listener/detector from the personal repository into the Enterprise repository (`ALM-Media-Entertainment-Software`) and hooking it to `mapitout:telemetry` / the AI request pipeline.
