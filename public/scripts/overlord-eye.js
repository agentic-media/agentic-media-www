/* OverlordEye — slow drifting particles + a single scanning beam.
   Decorative-only. Auto-disables under prefers-reduced-motion or
   when --am-anim-enabled is "0".

   Usage:
     <canvas id="overlord-eye"></canvas>
     <script src="overlord-eye.js"></script>
     OverlordEye.mount(document.getElementById('overlord-eye'), {
       density: 0.6,         // particles per 1000 px²
       beamPeriod: 12000,    // ms per scan cycle
       color: '#7c5cff',     // accent for both particles + beam
       beamColor: '#6ee7b7'  // optional override for the beam
     });
*/
(function (root) {
  'use strict';

  const DEFAULTS = {
    density: 0.5,
    beamPeriod: 12000,
    color: '#7c5cff',
    beamColor: '#6ee7b7',
    fadeOpacity: 0.06,
  };

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function shouldRun() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const enabled = getComputedStyle(document.documentElement).getPropertyValue('--am-anim-enabled').trim();
    if (enabled === '0') return false;
    return true;
  }

  function mount(canvas, userOpts) {
    const opts = Object.assign({}, DEFAULTS, userOpts || {});
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles = [];
    let raf = 0;
    let started = 0;
    let running = shouldRun();

    function resize() {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.floor(r.width * dpr);
      canvas.height = Math.floor(r.height * dpr);
      const count = Math.max(20, Math.floor((r.width * r.height) / 1000 * opts.density));
      particles = new Array(count).fill(0).map(() => ({
        x: rand(0, canvas.width),
        y: rand(0, canvas.height),
        vx: rand(-0.05, 0.05) * dpr,
        vy: rand(-0.05, 0.05) * dpr,
        r: rand(0.4, 1.6) * dpr,
        a: rand(0.15, 0.6),
      }));
    }

    function frame(t) {
      if (!started) started = t;
      const elapsed = t - started;

      // gentle trail-fade instead of full clear → soft motion blur
      ctx.fillStyle = `rgba(11, 12, 14, ${opts.fadeOpacity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // particles
      ctx.fillStyle = opts.color;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; else if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; else if (p.y > canvas.height) p.y = 0;
        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // scanning beam — a soft horizontal sweep
      const phase = (elapsed % opts.beamPeriod) / opts.beamPeriod;
      const y = phase * canvas.height;
      const beamH = canvas.height * 0.18;
      const grad = ctx.createLinearGradient(0, y - beamH, 0, y + beamH);
      grad.addColorStop(0, 'rgba(110,231,183,0)');
      grad.addColorStop(0.5, 'rgba(110,231,183,0.10)');
      grad.addColorStop(1, 'rgba(110,231,183,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y - beamH, canvas.width, beamH * 2);

      // a thin line at the beam center
      ctx.strokeStyle = 'rgba(110,231,183,0.18)';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();

      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (!running) {
        // single static frame so the canvas isn't blank
        ctx.fillStyle = '#0b0c0e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    }

    resize();
    start();
    window.addEventListener('resize', () => { resize(); started = 0; });

    return {
      stop() { cancelAnimationFrame(raf); },
      destroy() { cancelAnimationFrame(raf); particles = []; },
    };
  }

  root.OverlordEye = { mount };
})(window);
