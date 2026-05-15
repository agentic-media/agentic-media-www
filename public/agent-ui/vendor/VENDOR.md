# Vendored libraries

These third-party files are shipped inside the agent-ui distribution so
every consumer (overlord-dashboard, lordship-dashboard, commons-app,
lordship websites) loads the same version with no runtime network
dependency. Sandbox tier has no outbound internet at request time.

| File | Source | Version | Licence |
|---|---|---|---|
| `htmx.min.js` | https://unpkg.com/htmx.org@2.0.4/dist/htmx.min.js | 2.0.4 | BSD-2-Clause |
| `htmx-ext-sse.js` | https://unpkg.com/htmx-ext-sse@2.2.2/sse.js | 2.2.2 | BSD-2-Clause |
| `htmx-ext-head-support.js` | https://unpkg.com/htmx-ext-head-support@2.0.2/head-support.js | 2.0.2 | BSD-2-Clause |
| `htmx-bundle.min.js` | concat of htmx.min.js + htmx-ext-sse.js | — | BSD-2-Clause |

## Why the bundle

Loading `htmx.min.js` and `htmx-ext-sse.js` as two separate `defer`
scripts hits a subtle race: depending on browser, the extension's
`htmx.defineExtension('sse', …)` call can complete AFTER htmx has
already scanned the DOM on `DOMContentLoaded` and built the per-element
extension list. Elements with `hx-ext="sse"` then have no EventSource
wired even though the extension is registered.

Concatenating the two files into `htmx-bundle.min.js` makes the
registration and the initial DOM scan happen in the same script-execution
turn, which removes the race entirely. The two source files remain in
the distribution so callers that need to load them separately (or
debug) still can.

## Bumping

To bump a vendored file:

```sh
curl -sfL https://unpkg.com/htmx.org@<version>/dist/htmx.min.js \
  -o dist/agent-ui/vendor/htmx.min.js
```

Update the table above, bump `dist/agent-ui/.agent-ui-version` if other
files in this release moved too, then run
`bootstrap/scripts/sync-agent-ui.sh` from the overlord workspace to
fan out across consumers.

## Why vendored

1. **No runtime internet in sandbox tier.** Lordship containers can't
   reach unpkg from the inside.
2. **One canonical version.** Three dashboards on three different
   htmx releases is exactly the drift we are eliminating in this
   layer.
3. **Patch in one place.** If a fix is needed (e.g. swap fragment
   stability), it lands in this directory and propagates by the
   normal sync.
