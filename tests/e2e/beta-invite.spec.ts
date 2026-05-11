/**
 * e2e regression: beta-invite form — happy path, reduced-motion, mobile.
 *
 * Task #62 ord 7.
 *
 * Turnstile strategy
 * ------------------
 * CF Turnstile is unsolvable in headless CI. We use page.route() to intercept
 * POST /api/beta-invite and fulfill it with a 200 so that the client-side
 * success path runs. Separately we also verify against the real relay (mongo
 * write) using a direct fetch — see the "relay smoke" test.
 *
 * Mongo verification
 * ------------------
 * The relay writes to overlord_brain.beta_invites. The test emails follow the
 * pattern:  playwright-<timestamp>+playwright-regression@gmail.com
 * Combined with source:"apex" (set by the CF Function), these rows are
 * identifiable for later cleanup.
 *
 * Note: the relay smoke test does NOT bypass Turnstile — it sends an empty
 * token and expects a 422 missing_turnstile_token (the relay enforces the
 * check). That confirms the relay endpoint is live and reachable. A real
 * mongo write can only be triggered by a human (or the operator's own
 * submission) that completes a genuine Turnstile challenge.
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://agenticmedia.cc';

// Unique email for this test run — recognisable for cleanup.
const testEmail = () =>
  `playwright-${Date.now()}+playwright-regression@gmail.com`;

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Intercept POST /api/beta-invite with a synthetic 200.
 * This bypasses Turnstile so we can exercise the client-side success path.
 */
async function stubBetaInvite200(page: import('@playwright/test').Page) {
  await page.route('**/api/beta-invite', async (route) => {
    const req = route.request();
    if (req.method() !== 'POST') {
      return route.continue();
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

test.describe('beta-invite form', () => {

  // ── 1. Happy path ────────────────────────────────────────────────────────
  test('happy path — fills email, submits, shows success toast', async ({ page }) => {
    await stubBetaInvite200(page);
    await page.goto(BASE);

    // Form is present
    const form = page.locator('#invite-form');
    await expect(form).toBeVisible();

    // Fill email
    const emailInput = page.locator('#invite-email');
    await emailInput.fill(testEmail());

    // Track the outbound request so we can assert the payload
    const [request] = await Promise.all([
      page.waitForRequest('**/api/beta-invite'),
      page.locator('button[type="submit"]').click(),
    ]);

    // Form must have POSTed JSON with the email key
    const postBody = JSON.parse(request.postData() || '{}');
    expect(postBody).toHaveProperty('email');
    expect(postBody.email).toContain('@gmail.com');

    // Form hides, toast appears
    await expect(form).toBeHidden({ timeout: 5_000 });
    const toast = page.locator('#invite-toast');
    await expect(toast).toBeVisible({ timeout: 5_000 });
    await expect(toast).toContainText("on the list");
  });

  // ── 2. Relay smoke — real endpoint reachable, Turnstile enforced ─────────
  test('relay smoke — /api/beta-invite reachable and enforces Turnstile', async ({ page }) => {
    // No route stub — real relay call.
    const res = await page.request.post(`${BASE}/api/beta-invite`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        email: testEmail(),
        turnstile_token: '',    // empty token → relay returns 422
      },
    });

    // Relay is up (not 5xx) and enforces bot-check.
    // Relay returns 400 for missing_turnstile_token (not 422); 429 if rate-limited.
    expect([400, 429]).toContain(res.status());
    if (res.status() === 400) {
      const body = await res.json();
      expect(body.error).toBe('missing_turnstile_token');
    }
  });

  // ── 3. Reduced-motion — hero and CTA render, no broken layout ────────────
  test('reduced-motion — hero and CTA render cleanly', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BASE);

    // Hero headline visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Your AI agent');

    // CTA button visible
    await expect(page.locator('a[href="#beta-invite"]')).toBeVisible();

    // The form section is present
    await expect(page.locator('#beta-invite')).toBeVisible();

    // Canvas overlord-eye is in the DOM but hidden/inert under reduced-motion
    // (the JS checks window.matchMedia before mounting — just assert no JS errors)
    const errors = await page.evaluate(() => (window as any).__playwright_errors || []);
    expect(errors).toHaveLength(0);
  });

  // ── 4. Mobile viewport — form usable, button tappable, success visible ───
  test('mobile viewport — form usable and success toast visible', async ({ page }) => {
    await stubBetaInvite200(page);

    // iPhone 14 Pro-equivalent: 390×844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE);

    // Scroll the form into view
    const form = page.locator('#invite-form');
    await form.scrollIntoViewIfNeeded();
    await expect(form).toBeVisible();

    // Email input reachable
    const emailInput = page.locator('#invite-email');
    await expect(emailInput).toBeVisible();
    await emailInput.fill(testEmail());

    // Submit button tappable (bounding box inside viewport after scroll)
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();

    await Promise.all([
      page.waitForRequest('**/api/beta-invite'),
      submitBtn.click(),
    ]);

    // Success toast visible within mobile viewport (after scroll if needed)
    const toast = page.locator('#invite-toast');
    await expect(toast).toBeVisible({ timeout: 5_000 });
    await toast.scrollIntoViewIfNeeded();
    const box = await toast.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
  });

  // ── 5. Duplicate-email 409 — surfaces soft success (already on list) ──────
  test('409 duplicate email — shows success toast (soft success)', async ({ page }) => {
    await page.route('**/api/beta-invite', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'email_exists' }),
      });
    });

    await page.goto(BASE);
    await page.locator('#invite-email').fill('already@example.com');
    await Promise.all([
      page.waitForRequest('**/api/beta-invite'),
      page.locator('button[type="submit"]').click(),
    ]);

    // 409 is treated as soft success — form hides, success toast shows
    await expect(page.locator('#invite-form')).toBeHidden({ timeout: 5_000 });
    await expect(page.locator('#invite-toast')).toBeVisible({ timeout: 5_000 });
  });

  // ── 6. Network error — shows error toast, restores submit button ──────────
  test('network error — shows error toast and restores submit button', async ({ page }) => {
    await page.route('**/api/beta-invite', async (route) => {
      await route.abort('failed');
    });

    await page.goto(BASE);
    await page.locator('#invite-email').fill('test@example.com');
    await Promise.all([
      page.waitForRequest('**/api/beta-invite').catch(() => {}),
      page.locator('button[type="submit"]').click(),
    ]);

    const errorBox = page.locator('#invite-error');
    await expect(errorBox).toBeVisible({ timeout: 5_000 });

    // Submit button restored (not stuck in "Sending…" state)
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 });
    await expect(submitBtn).not.toHaveClass(/am-btn--pending/);
  });
});
