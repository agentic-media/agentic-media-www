# @agentic-media/agent-ui — Integration Guide

v0.1 — adds **buttons**, **tabs**, and a **73-icon set** on top of the existing tokens + Blinker/Geist type system.

## What's in this drop

```
dist/agent-ui/
├── brand/
│   ├── tokens.css          ← extended: button/tab/icon token groups
│   └── fonts.css           ← (unchanged from v0)
├── components/
│   ├── components.css      ← .am-btn, .am-tabs, .am-icon (+ legacy aliases)
│   └── icons.js            ← optional: <span data-icon="…"> loader
├── icons/
│   ├── sprite.svg          ← 73 symbols, reference via <use href="…#name"/>
│   └── <name>.svg × 73     ← standalone files (CDN / Next.js Image / etc.)
└── assets/                 ← brand identity, NOT UI icons (added by overlord v0.1.0)
    ├── marks/              ← agenticmedia-mark.svg, agenticmedia-wordmark.svg, commons-crest.svg
    └── channels/           ← discord.svg, github.svg, telegram.svg, whatsapp.svg
```

### assets/ — brand marks and channel glyphs

The `assets/` subtree is not part of the upstream design-system zip. It is
maintained by the overlord and synced alongside the v2 dist. These are
**brand-identity-level SVGs**, not UI icons:

- `assets/marks/agenticmedia-mark.svg` — the Agentic Media eye/mark (favicon,
  app icon, header brand). Referenced as `<link rel="icon">` in `Base.astro`.
- `assets/marks/agenticmedia-wordmark.svg` — full horizontal wordmark.
- `assets/marks/commons-crest.svg` — commons lordship crest.
- `assets/channels/{discord,github,telegram,whatsapp}.svg` — official platform
  glyphs for channel-card UI.

Never use these as generic UI icons. For UI icons, use `icons/sprite.svg`.

## Drop-in install

In your app's HTML head — **two stylesheets, in order**:

```html
<link rel="stylesheet" href="/agent-ui/brand/tokens.css"/>
<link rel="stylesheet" href="/agent-ui/components/components.css"/>
```

`tokens.css` `@import`s `fonts.css` itself. No font tags needed.

## Buttons

Class pattern: `.am-btn` + `.am-btn--<variant>` + (optional) `.am-btn--<size>`.

```html
<button class="am-btn am-btn--primary">Activate agent</button>
<button class="am-btn am-btn--secondary am-btn--sm">Cancel</button>
<a class="am-btn am-btn--link">View docs →</a>
```

| Variant | Use for |
|---|---|
| `--primary` | The single most-important action per surface (mint, filled) |
| `--secondary` | Default outlined button — most common in dashboard |
| `--solid` | Filled neutral, sits on dark surfaces (modals, sticky bars) |
| `--ghost` | Chromeless until hover (toolbars, table rows) |
| `--iris` | Brand purple, reserved for the "discuss with overlord" CTA + marketing |
| `--danger` | Destructive (revoke, delete, force-pause) |
| `--warn` | Caution / acknowledge incident |
| `--link` | Inline text-only |

Sizes: `--sm` (28px), default md (34px), `--lg` (40px). Square icon-only with `--icon`. Pending state: `data-pending` + `<span class="am-btn-spinner">`. Group with `.am-btn-group`.

### Legacy markup
Existing `<button class="btn primary">` / `.btn.danger` / `.btn.ghost` markup from `dashboard.css` keeps working — alias rules in `components.css` re-skin it. Migrate to `.am-btn` at your leisure.

## Tabs

Three flavors of one primitive — all use `.am-tabs__tab`.

```html
<!-- underline (page nav) -->
<nav class="am-tabs">
  <a class="am-tabs__tab is-active">Overview</a>
  <a class="am-tabs__tab">Agents <span class="am-tabs__badge am-tabs__badge--ok">12</span></a>
</nav>

<!-- pill (in-card filters) -->
<nav class="am-tabs am-tabs--pill"> … </nav>

<!-- segmented (2–4 way switch) -->
<nav class="am-tabs am-tabs--segmented"> … </nav>
```

Active state: `.is-active` or `aria-selected="true"`. Badge tones: `--ok` `--warn` `--danger` `--iris`.

### Legacy markup
Existing `.tab-link.active` from `dashboard.css` is aliased — old markup auto-skins.

## Icons

Three integration paths, pick one per project (mixing fine):

**1. Sprite + `<use>`** (recommended — one HTTP request, themable):
```html
<svg class="am-icon"><use href="/agent-ui/icons/sprite.svg#dashboard"/></svg>
<svg class="am-icon am-icon--lg am-icon--accent"><use href="/agent-ui/icons/sprite.svg#bot"/></svg>
```

**2. Standalone files** (Next.js Image, CDN, email):
```html
<img src="/agent-ui/icons/check.svg" class="am-icon" alt=""/>
```

**3. Data-attribute loader** (optional, JS):
```html
<script src="/agent-ui/components/icons.js" defer></script>
<span class="am-icon" data-icon="bot" data-size="lg"></span>
```

Set `window.AM_ICON_BASE` before the script tag if your icons live somewhere other than `/agent-ui/icons/`.

### Sizes & tones
- `--sm` 14px · default md 16px · `--lg` 20px · `--xl` 24px
- All icons render in `currentColor` — set color on the parent.
- Helper tones: `--accent` `--warn` `--danger` `--iris` `--muted`

### The set (73 icons)
Nav · status · ops:
`dashboard home settings user logout login menu search bell` `plus minus x check arrow-{left,right} chevron-{up,down,left,right} external-link copy refresh` `circle-{check,warn,x,info,dot} shield shield-check eye eye-off lock unlock` `activity bar-chart pie-chart trending-{up,down} database server cpu cloud cloud-off globe network zap inbox list grid filter sort calendar clock` `bot terminal play pause stop edit trash download upload link qr message flag star tag folder file git-branch git-pull-request pulse`

## Tokens added in v0.1

```
--am-surface-3, --am-border-3        new "pressed" / hover-on-solid steps
--am-success, --am-success-tint      distinguish "succeeded" from "active" mint
--am-btn-h-{sm,md,lg}, --am-btn-px-* button geometry
--am-btn-radius, --am-btn-fz-*
--am-tab-h, --am-tab-px, --am-tab-fz, --am-tab-indicator-h
--am-icon-{sm,md,lg,xl}, --am-icon-stroke
```

## Migration checklist

- [ ] Add the two `<link>` tags (or `@import` in your global CSS)
- [ ] Existing `.btn` / `.tab-link` markup picks up the new look automatically — diff-check screenshots
- [ ] New surfaces: prefer `.am-btn` / `.am-tabs__tab` directly
- [ ] Replace ad-hoc inline SVGs with sprite `<use>` references
- [ ] Drop emoji status indicators in favor of `circle-check / circle-warn / circle-x`
- [ ] One `--primary` button per page; one `--iris` reserved for "discuss with overlord"

## Previews

- `preview/components-buttons-v2.html` — every variant × size × state
- `preview/components-tabs.html` — underline / pill / segmented
- `preview/components-icons.html` — full grid, click-to-copy names
- `preview/showcase-dashboard.html` — everything composed in a real dashboard

— v0.1 · agent-ui
