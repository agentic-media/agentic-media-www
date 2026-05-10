/**
 * CF Pages Function: POST /api/beta-invite
 *
 * Forwards beta-invite form submissions to the oauth-broker relay at
 * https://oauth.agenticmedia.cc/api/v1/beta-invites, which is the
 * canonical write path for overlord_brain.beta_invites.
 *
 * This Function does NOT verify the Turnstile token — that is done
 * server-side by the relay (TURNSTILE_SECRET lives in oauth-broker only).
 * The Function receives the raw token from the client widget and forwards
 * it in the relay payload so the relay can verify.
 *
 * Relay contract (POST /api/v1/beta-invites):
 *   body: { email, turnstile_token, source?, ua? }
 *   200  → { ok: true, ... }
 *   409  → { error: "email_exists" }
 *   422  → { error: "missing_turnstile_token" | "invalid_email" | ... }
 *   429  → rate limited by relay (IP-based, ~5/min)
 *   5xx  → relay error
 *
 * Env vars (CF Pages project settings):
 *   RELAY_BASE_URL  (optional) — defaults to https://oauth.agenticmedia.cc/api/v1
 *
 * Task #161.
 */

const DEFAULT_RELAY_BASE = 'https://oauth.agenticmedia.cc/api/v1';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost(context) {
  const relayBase = (context.env.RELAY_BASE_URL || DEFAULT_RELAY_BASE).replace(/\/$/, '');

  let body;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const { email, turnstile_token } = body;

  // Basic email shape validation — relay also validates, but fail fast here.
  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return jsonResponse({ error: 'invalid_email' }, 422);
  }

  // Relay payload
  const payload = {
    email: String(email).trim(),
    turnstile_token: turnstile_token || '',
    source: 'apex',
    ua: context.request.headers.get('user-agent') || '',
  };

  let relayRes;
  try {
    relayRes = await fetch(`${relayBase}/beta-invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[beta-invite] relay fetch error:', err);
    return jsonResponse({ error: 'relay_unreachable' }, 502);
  }

  let relayBody;
  try {
    relayBody = await relayRes.json();
  } catch {
    relayBody = null;
  }

  // Map relay status codes
  if (relayRes.status >= 200 && relayRes.status < 300) {
    return jsonResponse({ ok: true }, 200);
  }

  if (relayRes.status >= 400 && relayRes.status < 500) {
    // Pass through relay's error code + message for client UX
    return jsonResponse(
      relayBody || { error: 'relay_error' },
      relayRes.status
    );
  }

  // 5xx from relay → 502
  return jsonResponse({ error: 'relay_error' }, 502);
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

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
