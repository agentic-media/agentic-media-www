# Adoption checklist — per consumer

When a new consumer is brought onto the shared kit, or an existing one is being audited, walk this checklist top to bottom.

## 1. Static assets

- [ ] `public/agent-ui/` is present and matches `dist/agent-ui/` from the canonical agent-ui ref pinned in `/workspace/canonical/repos.yaml`.
- [ ] `public/agent-ui/.agent-ui-version` matches the pinned ref. (`cat public/agent-ui/.agent-ui-version`)
- [ ] `public/ui/styles/shell.css` is present (synced from `control-center/ui/styles/shell.css`).

To refresh both:

```sh
bash /workspace/bootstrap/scripts/sync-agent-ui.sh
bash /workspace/bootstrap/scripts/sync-control-center-ui.sh
```

## 2. Astro source

- [ ] `src/lib/control-center-ui/` is present (synced from `control-center/ui/`).
- [ ] `tsconfig.json` includes the path alias:
  ```json
  { "compilerOptions": { "paths": { "@ui/*": ["./src/lib/control-center-ui/*"], "@/*": ["./src/*"] } } }
  ```
- [ ] `src/layouts/<Name>Layout.astro` imports `@/ui/layouts/{Dash,Auth,App}Shell.astro` rather than redefining a shell.

## 3. htmx baseline

The shell already loads the vendored htmx; no consumer-level work is required. Verify:

- [ ] Open the rendered HTML for any page and confirm:
  ```html
  <script src="/agent-ui/vendor/htmx.min.js" defer></script>
  <script src="/agent-ui/vendor/htmx-ext-sse.js" defer></script>
  <body ... hx-headers='{"X-Requested-With":"htmx"}'>
  ```
- [ ] `window.htmx` is defined at runtime (open devtools console on any page).

## 4. Endpoint discipline

- [ ] All htmx-targeted endpoints live under `src/pages/api/partials/<feature>/<action>.ts` or `src/pages/api/stream/<topic>.ts`.
- [ ] Each returns `text/html` when `HX-Request: true` and JSON otherwise.
- [ ] Each emits `HX-Redirect: /login` on 401.
- [ ] Success/failure surfaces emit `HX-Trigger: {"dashToast": {...}}` where appropriate.

## 5. Pages

- [ ] No `<script is:inline>` `fetch()` blocks where an `hx-*` attribute would do.
- [ ] No raw `new EventSource(...)` where `hx-ext="sse"` + `sse-swap` would do.
- [ ] Page imports `<Name>Layout.astro`, not the shell directly.

## 6. Fluid scale (optional)

- [ ] Pages that want the fluid look apply `class="am-fluid"` at a wrapper, not at `<body>`.
- [ ] `.am-grid` / `.am-card` / `.am-stack` / `.am-cluster` used where appropriate; no hand-rolled CSS-grid duplicates the same behaviour.

## 7. Testing

- [ ] Page has a `vitest` unit test for its server-side logic.
- [ ] At least one playwright-cli smoke asserts an htmx swap end-to-end. (frontend-qa runs this.)

## 8. Visual smoke

- [ ] `playwright-cli snapshot <consumer-url>` produces a screenshot that visually matches the canonical lordship-dashboard look — same fonts, same header geometry, same card rhythm.

---

## Current status

| Consumer | Sync | Shell | Conventions | Migrations |
|---|---|---|---|---|
| lordship-dashboard | ✅ | DashShell + AuthShell | ✅ | logs, credentials (this session) |
| overlord-dashboard | ✅ (this session) | DashShell (this session) | ✅ | index SSE (this session) |
| commons-app | ✅ (this session) | AppShell (this session) | ✅ | none migrated yet |
| agentic-media-www | ✅ | n/a (Astro static site, not a dashboard) | n/a | n/a |

Update this table whenever a consumer adoption step lands.
