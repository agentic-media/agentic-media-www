import { defineConfig } from 'astro/config';

// https://astro.build/config
// Static output: CF Pages serves the dist/ directory directly.
// The beta-invite API endpoint (src/pages/api/beta-invite.ts) falls back to a
// mailto: link in static mode — real persistence is wired in step 3 (task #62)
// when a Cloudflare Worker handles the POST.
export default defineConfig({
  output: 'static',
  site: 'https://agenticmedia.cc',
});
