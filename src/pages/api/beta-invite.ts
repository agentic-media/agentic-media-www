/**
 * /api/beta-invite — beta invite capture endpoint
 *
 * v1 STUB: This file is included for documentation and future activation.
 * In static output mode (current), Astro does not execute server endpoints;
 * the form's client-side script POSTs here but the request 404s until a
 * Cloudflare Worker or adapter is wired.
 *
 * Step 3 of task #62 (mongobrain-sage + cloudflare-custodian) will replace
 * this with a Worker that writes to overlord_brain.beta_invites:
 *   { email, handle?, source: "agenticmedia.cc", requested_at, status: "pending" }
 *
 * To activate server endpoints without a full adapter, options are:
 *   A) Add @astrojs/cloudflare adapter (changes output to 'server') and deploy
 *      via wrangler — aligns with dashboard pattern.
 *   B) Keep static output, replace this file with a standalone Cloudflare Worker
 *      at /api/beta-invite (separate worker route on the same domain) — cleanest
 *      separation for a single endpoint.
 *   Recommendation: option B. The marketing site stays fully static; the Worker
 *   handles the POST and writes to mongo via the existing overlord broker.
 *
 * @see task #62 step 3 for the Worker implementation dispatch.
 */

import type { APIRoute } from 'astro';

interface BetaInvitePayload {
  email: string;
  handle?: string;
}

export const POST: APIRoute = async ({ request }) => {
  let payload: BetaInvitePayload;

  try {
    payload = await request.json() as BetaInvitePayload;
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid JSON payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { email, handle } = payload;

  // Basic server-side email validation
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid email address' }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // v1 stub: log and return 200. Real persistence wired in task #62 step 3.
  console.log('[beta-invite]', {
    email,
    handle: handle || null,
    source: 'agenticmedia.cc',
    requested_at: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({ ok: true, message: "You're on the list." }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://agenticmedia.cc',
      },
    }
  );
};

// OPTIONS for CORS preflight (used by the fetch from the client script)
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://agenticmedia.cc',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
