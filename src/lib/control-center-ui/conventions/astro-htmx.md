# Astro + htmx — the unified dashboard structure

This document is the canonical structure for every agentic-media dashboard:

- **overlord-dashboard** (`/agentic-media/dashboard`) — operator surface for the overlord workspace, tailnet-only.
- **lordship-dashboard** (`/agentic-media/lordship-dashboard`) — per-lordship operator console.
- **commons-app** (`/agentic-media/commons-app`) — public-facing commons site / reader UI.

All three consume:

- `@agentic-media/agent-ui` (`/agentic-media/agent-ui`) for design tokens, fonts, components.css, the fluid scale, and the vendored htmx libraries. Synced into `public/agent-ui/` by `bootstrap/scripts/sync-agent-ui.sh`.
- `@agentic-media/control-center/ui` (this directory) for shared Astro layouts and components. Synced into `src/lib/control-center-ui/` by `bootstrap/scripts/sync-control-center-ui.sh`, imported with the `@ui/*` path alias.

If you are about to add a new page, a new partial endpoint, or a new live-update surface, read this doc end to end before touching code.

---

## Directory layout

Every consumer follows the same structure. The bracketed name in
brackets is the consumer-specific touchpoint.

```
<consumer>/
├── public/
│   ├── agent-ui/                          ← synced from agent-ui dist; do not edit by hand
│   │   ├── brand/{tokens,fluid,fonts}.css
│   │   ├── components/components.css
│   │   ├── icons/sprite.svg
│   │   ├── vendor/{htmx.min,htmx-ext-sse,htmx-ext-head-support}.js
│   │   └── assets/...
│   └── ui/
│       └── styles/shell.css               ← synced from control-center/ui/styles
├── src/
│   ├── lib/control-center-ui/             ← synced from control-center/ui; do not edit by hand
│   │   ├── layouts/{DashShell,AuthShell,AppShell}.astro
│   │   ├── components/*.astro
│   │   ├── styles/shell.css
│   │   └── types/tabs.ts
│   ├── layouts/                           ← thin consumer-specific wrappers around the shells
│   │   └── <Name>Layout.astro
│   ├── pages/
│   │   ├── <route>.astro                  ← full-document pages
│   │   └── api/
│   │       ├── partials/                  ← htmx partial endpoints (return HTML fragments)
│   │       │   └── <feature>/<action>.ts
│   │       └── stream/                    ← SSE endpoints (return event:fragment frames)
│   │           └── <topic>.ts
│   └── lib/                               ← consumer-specific code
└── astro.config.mjs
```

### Rules

1. **Never hand-edit `public/agent-ui/` or `src/lib/control-center-ui/`.** Both are synced from upstream by the bootstrap scripts. Hand-edits get clobbered on next sync.
2. **Layouts wrap shells, don't reinvent them.** A consumer-specific layout (`src/layouts/DashLayout.astro` in lordship-dashboard) imports `@ui/layouts/DashShell.astro` and passes consumer-specific context (e.g. the lordship slug, the resolved tabs list). It does not redefine the shell.
3. **Partial endpoints live under `src/pages/api/partials/`.** Grep-able separately from full JSON APIs. Each partial returns an HTML fragment when `HX-Request: true`, and may return JSON otherwise.
4. **SSE endpoints live under `src/pages/api/stream/`.** They emit `event: <name>\ndata: <html-fragment>\n\n` frames.

---

## Three shells, three jobs

| Shell | When | Look | Used by |
|---|---|---|---|
| `DashShell` | Authenticated operator surfaces | Tab rail + sticky header + scrollable content frame | overlord-dashboard, lordship-dashboard |
| `AuthShell` | Pre-auth (login, permission-denied) | Centred 480px card on near-black background | overlord-dashboard, lordship-dashboard |
| `AppShell` | Public/site surfaces | Top header strip + main + footer | commons-app, future public surfaces |

All three:

- Link the three CSS files in the same order — `tokens.css`, `fluid.css`, `components.css`, then `shell.css`.
- Load **`/agent-ui/vendor/htmx-bundle.min.js`** — the concatenation of `htmx.min.js` + `htmx-ext-sse.js`. NEVER load the two as separate `<script defer>` tags: there is a race where `htmx-ext-sse` can register AFTER htmx has scanned the DOM on `DOMContentLoaded`, leaving `hx-ext="sse"` elements with no EventSource wired up. The bundle puts both registration and the initial scan in the same script-execution turn. See `agent-ui/dist/agent-ui/vendor/VENDOR.md`.
- Set `hx-headers='{"X-Requested-With":"htmx"}'` on `<body>` so server routes can recognise htmx requests via the `X-Requested-With` header *as well as* the standard `HX-Request` header. (Defense in depth — `HX-Request` is what htmx itself sets and we use that everywhere.)
- Register `htmx:responseError` and `htmx:sseError` listeners that emit a `dashToast` automatically — partial endpoints don't need to repeat that boilerplate.

A consumer-specific layout typically looks like this:

```astro
---
// src/layouts/DashLayout.astro  (lordship-dashboard)
import DashShell from '@ui/layouts/DashShell.astro';
import { getTabRegistrations } from '@/lib/tabs.config';

const lordship = Astro.locals.lordship;
const session = Astro.locals.session;
const tabs = getTabRegistrations({ slug: lordship.slug, ... });
---
<DashShell tabs={tabs} currentPath={Astro.url.pathname}
           slug={lordship.slug} version={lordship.version}
           githubUser={session?.ghLogin}>
  <slot />
</DashShell>
```

Pages then import the consumer layout, not the shell directly.

#### DashShell props worth knowing

Beyond the obvious `tabs` / `currentPath` / `slug`:

| Prop | Type | What it does |
|---|---|---|
| `brandPrefix` / `brandSuffix` | `string` | Override the rail's brand label. Renders as `{prefix}<em>·{suffix}</em>`. Default: `"lord" / "ship"`. overlord-dashboard sets `"over" / "lord"`. |
| `extraStylesheets` | `string[]` | URLs `<link>`-loaded into `<head>` AFTER `tokens.css` + `fluid.css` + `components.css` + `shell.css`. Use for a consumer's legacy page CSS that hasn't migrated to `am-*` primitives yet (e.g. overlord-dashboard passes `["/dashboard.css"]`). Consumer rules win the cascade. |
| `passthrough` | `boolean` | Strips content padding for full-bleed iframe tabs. |
| `pageTitle` | `string` | Overrides the `<title>` derivation. |

---

## htmx — the two patterns

### Pattern 1 — action POST with partial response

```astro
<!-- src/pages/credentials.astro -->
<section id="credentials-card">
  <button class="am-btn am-btn--primary"
          hx-post="/api/partials/credentials/refresh"
          hx-target="#credentials-card"
          hx-swap="outerHTML"
          hx-indicator="#refresh-spinner">
    Refresh
  </button>
  <span id="refresh-spinner" class="htmx-indicator">…</span>
</section>
```

```ts
// src/pages/api/partials/credentials/refresh.ts
import type { APIRoute } from 'astro';
import { renderRefreshedCard } from '@/lib/render/credentials';
import { refreshCredentials } from '@/lib/services/credentials';

export const POST: APIRoute = async ({ request }) => {
  const isHtmx = request.headers.get('HX-Request') === 'true';
  const result = await refreshCredentials();

  if (isHtmx) {
    return new Response(renderRefreshedCard(result), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'HX-Trigger': JSON.stringify({
          dashToast: { message: 'Credentials refreshed', tone: 'ok' },
        }),
      },
    });
  }
  return Response.json(result);
};
```

`renderRefreshedCard` returns the same `<section id="credentials-card">…</section>` markup the page would render server-side. htmx replaces the whole section with the new one. No state in the client; the fragment **is** the new state.

### Pattern 2 — live update via SSE

```astro
<!-- src/pages/logs.astro -->
<section hx-ext="sse" sse-connect={`/api/stream/logs?container=${container}`}>
  <div id="logs-body" sse-swap="line" hx-swap="beforeend">
    {/* server-rendered initial bootstrap lines */}
  </div>
</section>
```

```ts
// src/pages/api/stream/logs.ts
export const GET: APIRoute = ({ url }) => {
  const container = url.searchParams.get('container');
  const stream = new ReadableStream({
    async start(controller) {
      for await (const line of tailDocker(container)) {
        const html = renderLogLine(line);  // returns <div class="dsh-log__line">…</div>
        controller.enqueue(`event: line\ndata: ${html.replace(/\n/g, '')}\n\n`);
      }
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    },
  });
};
```

The SSE extension reads the named event (`line`), takes the `data:` payload as raw HTML, and swaps it into the target with the page-specified `hx-swap` (`beforeend` for log streams, `innerHTML` for the dev tab snapshot).

#### When NOT to use SSE

- One-shot updates → use Pattern 1.
- High-frequency events (>10/sec) → use a websocket or polling instead. SSE through Astro server-output can buffer; we have not tuned for this rate.
- Bidirectional flows → SSE is one-way; use a partial-POST round trip.

---

## Response headers

| Header | When to emit | Effect |
|---|---|---|
| `Content-Type: text/html; charset=utf-8` | All HTML fragments | tells htmx to swap as HTML |
| `HX-Trigger: {"dashToast": {...}}` | Show a toast on success/failure | the page's `Toast` host catches it |
| `HX-Redirect: /login` | Session expired | htmx follows it as a full nav |
| `HX-Reswap: outerHTML` | Override the default page swap | rare; per-response control |
| `HX-Push-Url: /new-path` | URL should update after the swap | useful for filter/order changes |
| `HX-Trigger-After-Swap: ...` | Fire a custom event after content lands | use for focus management |

### `dashToast` schema

```ts
{
  message: string;            // required
  tone?: 'ok' | 'warn' | 'danger';   // default 'ok'
  duration?: number;          // ms, default 4000
  href?: string;              // navigates on click
}
```

Registered by `Toast.astro`, available globally as `window.dashToast(...)`. All three shells mount the Toast host once. Partial endpoints just emit `HX-Trigger`.

### Auth redirect

```ts
if (!session) {
  return new Response(null, {
    status: 401,
    headers: { 'HX-Redirect': '/login' },
  });
}
```

htmx follows `HX-Redirect` on the *response* even when the status is 401. Use this from any partial that finds the session expired.

---

## Component conventions

The 21 components under `src/lib/control-center-ui/components/` are static building blocks. They render the same HTML on initial SSR and on htmx swap. Render them server-side both ways:

```astro
---
// src/pages/api/partials/.../refresh.ts → renders KpiTile inside response
import KpiTile from '@ui/components/KpiTile.astro';
// Use Astro's Component.render() API or astro-template-string helper.
---
```

When the same fragment appears on initial page render and in a partial response, factor it into `src/lib/render/<feature>.ts` (a function that returns a string) or into a `<Fragment>` component. The page renders the `<Fragment>` server-side; the partial endpoint imports and renders the same one.

### Block vs. inline children in SSE fragments

When a fragment is `innerHTML`-swapped into a flex-column container (an `.am-card`, `.kpi-tile`, etc.), its top-level children must be **block** elements (`<div>`, `<section>`) so the flex layout stacks them. `<span>` children sit inline and collapse against each other — the visible symptom is "two lines of text running together with no gap". Default to `<div>` for top-level lines in any SSE fragment.

---

## Fluid scale — when to opt in

The fluid scale (`/agent-ui/brand/fluid.css`) defines `--am-fluid-text-*` and `--am-fluid-space-*` plus layout primitives (`.am-stack`, `.am-cluster`, `.am-grid`, `.am-card`, `.am-content`). It is **purely additive** — the absolute `--am-text-*` and `--am-s-*` tokens keep working.

Adopt the fluid scale at the page level:

```astro
<DashLayout>
  <section class="am-fluid am-content">
    <div class="am-stack am-stack--lg">
      <h1>Provisioning</h1>
      <div class="am-grid" style="--am-grid-min: 18rem;">
        <article class="am-card"> ... </article>
        <article class="am-card"> ... </article>
        <article class="am-card"> ... </article>
      </div>
    </div>
  </section>
</DashLayout>
```

`.am-card` is a container-query root: the `.am-grid` inside collapses to one column when **the card** narrows, independent of viewport. This is what makes a sidebar widget render single-column while a full-width widget on the same page renders multi-column.

Don't migrate legacy widgets to fluid in the same PR as their feature work. Keep the migration to a separate, focused change.

---

## Adoption checklist (per new page)

Before merging:

- [ ] Page imports the consumer's `*Layout.astro`, not the shell directly.
- [ ] Server-only interactive surfaces use `hx-*` attributes, not `<script>` blocks.
- [ ] Partial endpoints under `src/pages/api/partials/<feature>/<action>.ts`.
- [ ] Partial responses set `Content-Type: text/html; charset=utf-8` and (where relevant) `HX-Trigger: {"dashToast": ...}`.
- [ ] SSE endpoints under `src/pages/api/stream/<topic>.ts`, emit named events with HTML fragments as `data:`.
- [ ] 401 responses from partials set `HX-Redirect: /login`.
- [ ] No new client-side JS unless htmx genuinely doesn't cover it. If you must add JS, register it inside the page's `<script is:inline>` block and gate behaviour on `htmx:afterSwap` if it needs to re-bind after a partial.
- [ ] If you used the fluid scale, wrap with `class="am-fluid"` so the page's type-size is opt-in.

---

## When the shells are insufficient

If a surface doesn't fit DashShell, AuthShell, or AppShell, **don't fork a shell.** Open a backlog task in `overlord_brain.tasks` describing the surface; the kit grows by addition (a fourth shell) when there are at least two consumers that would use it. One-off layouts are smell.

---

## Related docs

- `partial-endpoints.md` — the server-side response contract.
- `adoption-checklist.md` — per-consumer migration gate.
- `/agentic-media/agent-ui/dist/agent-ui/INTEGRATION.md` — the design-system distribution.
- `/workspace/runbooks/dashboards-unified-structure.md` — operator entry point.
