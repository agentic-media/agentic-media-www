/**
 * CF Pages Function: POST /api/beta-invite
 *
 * Handles beta-invite form submissions for agenticmedia.cc.
 * v1 stores records in CF KV (BETA_INVITES namespace binding).
 * If the binding is absent (local dev / preview without bindings),
 * falls back to console.log so the form still shows success UX.
 *
 * KV key format: invite:<timestamp>:<email>
 * KV value: JSON { email, handle, source, requested_at, status }
 *
 * Bindings required in Cloudflare Pages project settings:
 *   KV namespace  BETA_INVITES  → your KV namespace ID
 *
 * Part of task #62.
 */

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { email, handle } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const doc = {
      email,
      handle: handle || null,
      source: 'agenticmedia.cc',
      requested_at: new Date().toISOString(),
      status: 'pending',
    };

    const kv = context.env.BETA_INVITES;
    if (kv) {
      await kv.put(`invite:${Date.now()}:${email}`, JSON.stringify(doc));
    } else {
      // Dev / preview fallback — binding not attached
      console.log('BETA_INVITE (no KV binding):', JSON.stringify(doc));
    }

    return new Response(
      JSON.stringify({ ok: true, message: 'Thanks! We will email you when your wave opens.' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
