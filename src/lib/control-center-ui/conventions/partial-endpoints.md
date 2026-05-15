# Partial endpoints — server contract

Every interactive surface in the dashboard constellation is built on two endpoint families:

- **Partials** at `src/pages/api/partials/<feature>/<action>.ts` — return HTML fragments to htmx.
- **Streams** at `src/pages/api/stream/<topic>.ts` — emit SSE event:fragment frames.

This document is the contract every endpoint follows.

## 1. Request detection

```ts
const isHtmx = request.headers.get('HX-Request') === 'true';
```

htmx sets `HX-Request: true` on every request it makes. Use this as the single discriminator between HTML and JSON responses. Do not use `Accept` headers — htmx leaves `Accept: */*` and you'll get false negatives.

## 2. Authentication

If the session is missing or expired:

```ts
if (!session) {
  return new Response(null, {
    status: 401,
    headers: { 'HX-Redirect': '/login' },
  });
}
```

htmx follows `HX-Redirect` regardless of the response status. A bare 401 with the redirect header is enough — no body needed.

For non-htmx callers (curl, JSON consumers), keep the standard 401 + JSON `{ error: "..." }` body. Branch on `isHtmx`.

## 3. Success response — full pattern

```ts
import type { APIRoute } from 'astro';
import { renderCredentialsCard } from '@/lib/render/credentials';

export const POST: APIRoute = async ({ request, locals }) => {
  const isHtmx = request.headers.get('HX-Request') === 'true';
  const session = locals.session;
  if (!session) {
    return new Response(null, { status: 401, headers: { 'HX-Redirect': '/login' } });
  }

  try {
    const result = await refreshCredentials(session.lordshipSlug);

    if (isHtmx) {
      const html = renderCredentialsCard(result);
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'HX-Trigger': JSON.stringify({
            dashToast: { message: 'Credentials refreshed', tone: 'ok' },
          }),
        },
      });
    }
    return Response.json(result);
  } catch (err) {
    if (isHtmx) {
      return new Response(renderErrorWidget(err), {
        status: 500,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'HX-Trigger': JSON.stringify({
            dashToast: { message: `Refresh failed: ${err.message}`, tone: 'danger' },
          }),
        },
      });
    }
    return Response.json({ error: err.message }, { status: 500 });
  }
};
```

## 4. Headers — full table

| Header | Direction | Effect |
|---|---|---|
| `HX-Request: true` | request | htmx-issued request |
| `HX-Target: <id>` | request | id of the element targeted by the swap |
| `HX-Trigger: <id>` | request | id of the element that triggered the request |
| `HX-Current-URL: <url>` | request | the current page URL — useful for back/forward |
| `Content-Type: text/html; charset=utf-8` | response | tells htmx to swap as HTML |
| `HX-Trigger: {"dashToast":{...}}` | response | fire the dashToast event after swap |
| `HX-Trigger-After-Swap: {"event":{}}` | response | fire a custom event after the DOM swap completes |
| `HX-Trigger-After-Settle: {"event":{}}` | response | fire after the swap + settle phase (focus management) |
| `HX-Redirect: /login` | response | full-page navigation |
| `HX-Refresh: true` | response | force-reload the current page |
| `HX-Reswap: outerHTML` | response | override the page-declared swap mode |
| `HX-Retarget: #other` | response | override the page-declared target |
| `HX-Push-Url: /new` | response | update browser URL after the swap |
| `HX-Replace-Url: /new` | response | replace browser URL (no history entry) |

## 5. Rendering fragments

When the same fragment renders on both initial page SSR and in a partial response, factor it into one of:

- **A render function in `src/lib/render/<feature>.ts`** that returns a string. The page uses `set:html` from `Astro` to inject the same string at SSR time. Best for small fragments.

  ```ts
  // src/lib/render/credentials.ts
  export function renderCredentialsCard(state: CredsState): string {
    return `
      <section id="credentials-card" class="am-card">
        <h2>Credentials</h2>
        <p>Expires <time>${state.expiresAt}</time></p>
        <button class="am-btn am-btn--primary"
                hx-post="/api/partials/credentials/refresh"
                hx-target="#credentials-card"
                hx-swap="outerHTML">Refresh</button>
      </section>`;
  }
  ```

- **A `<Fragment>` component** that the page renders server-side and the partial endpoint imports + renders. Best for richer fragments. Requires the Astro container API:

  ```ts
  import { experimental_AstroContainer } from 'astro/container';
  import CredentialsCard from '@/components/CredentialsCard.astro';

  const container = await experimental_AstroContainer.create();
  const html = await container.renderToString(CredentialsCard, { props: { state } });
  ```

In both cases the page and the partial render the **same** markup. If you find yourself rendering the partial twice (once on initial, once on refresh), you've diverged the source of truth.

## 6. SSE — stream endpoints

```ts
// src/pages/api/stream/dev.ts
export const GET: APIRoute = ({ locals }) => {
  if (!locals.session) {
    return new Response(null, { status: 401, headers: { 'HX-Redirect': '/login' } });
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: string) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data.replace(/\n/g, ' ')}\n\n`));

      // Initial snapshot
      send('snapshot', renderDevSnapshot(await currentDevState()));

      // Watch for changes
      const watcher = watchDevTasks();
      for await (const change of watcher) {
        send('snapshot', renderDevSnapshot(change));
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

Page side:

```astro
<section hx-ext="sse" sse-connect="/api/stream/dev">
  <div sse-swap="snapshot" hx-swap="innerHTML">
    {renderDevSnapshot(initialState)}
  </div>
</section>
```

### SSE rules

- **Event names are stable.** Once a page declares `sse-swap="snapshot"`, the server emits `event: snapshot` frames forever. Add a new event name rather than rename an existing one.
- **Data is single-line HTML.** SSE `data:` fields can't contain newlines; either strip newlines or send each line as a separate `data:` (htmx joins them with `\n`).
- **Send a keep-alive every ~25s.** Many proxies (including Cloudflare's tunnel) cut idle connections. Use a comment frame `: ping\n\n` if the source data is sparse.
- **Close cleanly on client disconnect.** Hook `request.signal.aborted` and end the loop. Leaked watchers eat the mongo replica set.

## 7. Error responses

Always return a fragment, never a bare 500:

```ts
return new Response(renderErrorWidget(err), {
  status: 500,
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'HX-Trigger': JSON.stringify({
      dashToast: { message: err.message, tone: 'danger' },
    }),
  },
});
```

The body should fit inside the page's `hx-target` so the user sees what failed. The toast carries the message; the in-page widget carries the context (e.g. "credentials refresh failed: codex device-auth timed out").

If the request was not htmx, return JSON with the same `{ error }` shape.

## 8. Cache headers

Partial endpoints are **never** cached at the edge:

```ts
headers: {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  ...
}
```

The default Astro `Cache-Control` for server routes is `private, no-cache`, which is also acceptable. Be explicit if you set anything else.

## 9. Testing

Each partial endpoint gets a vitest test that asserts:

- Returns 401 with `HX-Redirect` when session is missing.
- Returns HTML with `Content-Type: text/html` when `HX-Request: true`.
- Returns JSON with the equivalent payload when `HX-Request` is absent.
- Sets `HX-Trigger` on success (where applicable).

The playwright-cli smoke driven by frontend-qa asserts the end-to-end swap.
