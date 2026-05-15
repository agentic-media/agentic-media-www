# control-center/ui

Shared UI library for the agentic-media dashboard constellation.

**Version:** 0.2.0
**Design source:** `design-imports/lordship-dashboard-brief.md` + design zip 2026-05-09; unified-dashboard-htmx session 2026-05-14
**Token dependency:** `agentic-media/agent-ui` v0.2 (vendored htmx + fluid scale)

## Read first

If you are about to add a new page, partial endpoint, or live-update
surface in any agentic-media dashboard, start here:

- **[`conventions/astro-htmx.md`](conventions/astro-htmx.md)** — canonical Astro+htmx structure, directory layout, three shells, request/response contract, the two interaction patterns.
- **[`conventions/partial-endpoints.md`](conventions/partial-endpoints.md)** — server-side contract for `src/pages/api/partials/...` and `src/pages/api/stream/...`.
- **[`conventions/adoption-checklist.md`](conventions/adoption-checklist.md)** — per-consumer migration gate.

All three dashboards (`overlord-dashboard`, `lordship-dashboard`,
`commons-app`) consume this kit. See the adoption-checklist for
current status per consumer.

---

## What this package is

A collection of plain Astro components, one TypeScript types file, and one structural CSS file. No build step, no npm package, no framework dependency beyond Astro itself.

Consuming apps copy it in verbatim via `bootstrap/scripts/sync-control-center-ui.sh` — the same pattern as `sync-agent-ui.sh`. The lordship containers bake `/public/` at image build time and have no network access to npm at runtime.

This is the foundation that `lordship-dashboard` consumes. The `overlord-dashboard` and `commons-app` migrate onto it in later sessions.

---

## Directory layout

```
ui/
├── layouts/
│   ├── DashShell.astro       — authenticated shell (rail + header + content)
│   ├── AuthShell.astro       — pre-auth shell (login, permission-denied)
│   └── AppShell.astro        — public site shell (commons-app, agenticmedia.cc)
├── components/               — 21 reusable components
│   ├── TabRail.astro
│   ├── DashHeader.astro
│   ├── UserMenu.astro
│   ├── Breadcrumb.astro
│   ├── StatusPill.astro
│   ├── ExpiryChip.astro
│   ├── KpiTile.astro
│   ├── Widget.astro
│   ├── DataTable.astro
│   ├── KeyValueList.astro
│   ├── CodeBlock.astro
│   ├── LogTail.astro
│   ├── LoadingSkeleton.astro
│   ├── EmptyState.astro
│   ├── ErrorWidget.astro
│   ├── Toast.astro
│   ├── Modal.astro
│   ├── ButtonRow.astro
│   ├── FormField.astro
│   ├── PassthroughFrame.astro
│   └── GitHubSignInButton.astro
├── types/
│   └── tabs.ts               — TabRegistration / PermissionLevel / TabBadge / ComponentKind
├── styles/
│   └── shell.css             — --dsh-* tokens + structural grid rules + .app-shell__*
└── conventions/
    ├── astro-htmx.md         — the unified dashboard structure
    ├── partial-endpoints.md  — server response contract
    └── adoption-checklist.md — per-consumer migration gate
```

---

## How to consume

### 1. Sync the package

The consuming app's image build calls:

```sh
rsync -av /repos/control-center/ui/ /app/src/ui/
```

Or via the bootstrap script:

```sh
bash bootstrap/scripts/sync-control-center-ui.sh
```

After sync, the consumer has `src/ui/` with all layouts, components, types, and styles.

### 2. Serve the CSS

In your Astro `public/` directory, make sure both agent-ui and shell.css are accessible:

```
public/
├── agent-ui/           — synced from agentic-media/agent-ui
│   ├── brand/tokens.css
│   ├── components/components.css
│   └── icons/sprite.svg
└── ui/
    └── styles/shell.css
```

`DashShell` and `AuthShell` reference `/agent-ui/...` and `/ui/styles/shell.css` via `<link rel="stylesheet">`.

### 3. Use layouts

```astro
---
import DashShell from '@/ui/layouts/DashShell.astro';
import { getTabRegistrations } from '@/lib/tabs';

const tabs = getTabRegistrations(ctx);
---
<DashShell tabs={tabs} currentPath={Astro.url.pathname} slug="3venezie">
  <!-- page content -->
</DashShell>
```

```astro
---
import AuthShell from '@/ui/layouts/AuthShell.astro';
---
<AuthShell slug="3venezie" version="v2026.5.7">
  <h2>Sign in</h2>
  <!-- GitHubSignInButton, etc. -->
</AuthShell>
```

### 4. Use components

All components are imported directly from `@/ui/components/`:

```astro
---
import Widget from '@/ui/components/Widget.astro';
import StatusPill from '@/ui/components/StatusPill.astro';
---

<Widget title="Containers" meta="6 of 6 booted">
  <StatusPill tone="ok" label="running" />
</Widget>
```

---

## Token dependency

This package defines **no** new color or type tokens. All visual tokens come from `agent-ui` v0.1:

- `--am-*` — colors, type scale, spacing, radius, motion, shadows
- `--am-font`, `--am-font-display`, `--am-font-mono` — font families
- `.am-btn`, `.am-icon`, `.am-input` — component classes from agent-ui

Structural/layout tokens defined here (`styles/shell.css`):

| Token | Value | Purpose |
|---|---|---|
| `--dsh-rail-w` | 240px | Tab rail width at desktop |
| `--dsh-rail-w-collapsed` | 56px | Icon-only rail at tablet |
| `--dsh-header-h` | 56px | Header height |
| `--dsh-content-pad` | 24px | Page content padding |
| `--dsh-content-gap` | 20px | Gap between widgets |
| `--dsh-modal-w-sm` | 420px | Confirmation modal width |
| `--dsh-modal-w-md` | 640px | Rich modal width |

---

## Tab registration contract

The `types/tabs.ts` file exports the `TabRegistration` interface that every consuming dashboard implements:

```typescript
import type { TabRegistration } from '@/ui/types/tabs';

export function getTabRegistrations(ctx): TabRegistration[] {
  return [
    { path: '/',           label: 'overview',     icon: 'grid',     component_kind: 'overview' },
    { path: '/openclaw',   label: 'openclaw',     icon: 'terminal', component_kind: 'custom' },
    { path: '/filebrowser',label: 'filebrowser',  icon: 'folder',   component_kind: 'passthrough',
      passthrough_url: '/filebrowser/' },
    { path: '/browser',    label: 'browser',      icon: 'monitor',  component_kind: 'passthrough',
      passthrough_url: 'https://3venezie-browser.tail74c072.ts.net/' },
  ];
}
```

The TabRail component auto-groups tabs into named sections (control / passthrough / system) based on icon names. Override with the `sections` prop if needed.

---

## JavaScript APIs

### `window.dashToast(options)`

Defined by the `Toast` component (rendered once in `DashShell`):

```js
window.dashToast({ message: 'Credentials refreshed', tone: 'ok', duration: 4000 });
window.dashToast({ message: 'Session expired', tone: 'warn', href: '/login?next=/' });
```

Options: `message` (string), `tone` ('ok' | 'warn' | 'danger'), `duration` (ms, default 4000), `href` (navigates on click).

### Modal open

Trigger any Modal by adding `data-modal-open="<modalId>"` to a button:

```html
<button class="am-btn am-btn--warn" data-modal-open="refresh-modal">Refresh credentials</button>
```

### Rail toggle (mobile)

`DashHeader` dispatches `document.dispatchEvent(new CustomEvent('dsh:rail-toggle'))`. `DashShell` listens and toggles `data-open` on the rail element.

---

## Responsive behavior

| Breakpoint | Rail behavior |
|---|---|
| ≥ 1024px | Full 240px rail with labels |
| 768–1024px | Collapsed to 56px icons-only |
| ≤ 768px | Hidden; slide-in drawer via rail-toggle button in header |

---

## Accessibility

- All interactive elements are keyboard-navigable.
- Focus rings use `--am-accent` at 2px offset (defined globally in shell.css).
- TabRail uses `aria-current="page"` on the active link.
- Modal is a native `<dialog>` with `inert` on main content while open.
- Toast host has `aria-live="polite"`.
- EmptyState has `aria-live="polite"`.
- ErrorWidget uses `role="alert"` (danger) or `role="status"` (warn).
- All animations respect `prefers-reduced-motion`.
- Color contrast: mint on base ≥ 7:1, muted on base ≥ 4.5:1 (WCAG AA).

---

## Components not in scope

The following components from the design brief appear in page mockups but are page-level assemblies, not standalone library components:

- Page-level greeting strip (`.dsh-greet`) — utility class in shell.css, not a component
- KPI grid wrapper (`.dsh-kpis`) — CSS class only; wrap KpiTile elements in a `<div class="dsh-kpis">`

No components beyond the 23 in the brief were added. If a design element appears in the mockups but is not listed here, the relevant CSS class exists in `shell.css` or in the parent component's scoped style.

---

## Sync mechanism note

This package is distributed via filesystem copy, not as an npm package. The sync script must run before `astro build`. Consuming repos must not `import` from npm paths — all imports resolve relative to the copied `src/ui/` directory.

If the consuming app uses TypeScript path aliases, add:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/ui/*": ["./src/ui/*"]
    }
  }
}
```
