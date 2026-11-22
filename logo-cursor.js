/*
 * funkadeelia logo pointer
 * A weighted pendulum hung from the pointer's tip: it fades in when the mouse
 * moves, trails and swings with direction changes, and rocks to a stop and
 * fades out when the mouse stops. Skipped on touch screens and for visitors
 * who ask their device to reduce motion; they keep the normal cursor.
 */
(function () {
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduce) return;

  var CFG = {
    size: 18,           // px: about the size of the 'a' in the wordmark
    weight: 1,          // gravity: how strongly it returns to rest
    arm: 60,            // px: longer = slower, lazier swing
    drag: 0.12,         // how far it trails behind while moving
    damping: 0.025,     // swing loss while moving
    settleDamping: 0.07,// swing loss once stopped
    stopDelay: 140,     // ms without movement that counts as stopped
    fadeHold: 180,      // ms after stopping before the fade starts
    fadeOut: 0.08,      // fade-out speed per frame
    ink: '#111111',     // outline: matches the wordmark
    fill: '#FFFFFF'
  };

  var REST = Math.PI / 4; // weight hangs down-right: the normal pointer pose

  function init() {
    var style = document.createElement('style');
    style.textContent =
      'html.fk-cursor, html.fk-cursor * { cursor: none !important; }' +
      '.fk-pointer { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none;' +
      ' transform-origin: 0 0; opacity: 0; will-change: transform, opacity;' +
      ' filter: drop-shadow(0 3px 6px rgba(0,0,0,0.22)); }' +
      '.fk-pointer__outer { position: relative; width: ' + CFG.size + 'px; height: ' + CFG.size + 'px;' +
      ' border-radius: 0 50% 50% 50%; background: ' + CFG.ink + '; }' +
      // the logo turned 180°: square corner = the tip; thin (10%) along the corner edges,
      // thick (25%) round the curve, as in the logo
      '.fk-pointer__inner { position: absolute; left: 10%; top: 10%; width: 65%; height: 65%;' +
      ' border-radius: 0 50% 50% 50%; background: ' + CFG.fill + '; }';
    document.head.appendChild(style);

    var el = document.createElement('div');
    el.className = 'fk-pointer';
    el.setAttribute('aria-hidden', 'true');
    var outer = document.createElement('div');
    outer.className = 'fk-pointer__outer';
    var inner = document.createElement('div');
    inner.className = 'fk-pointer__inner';
    outer.appendChild(inner);
    el.appendChild(outer);
    document.body.appendChild(el);
    document.documentElement.classList.add('fk-cursor');

    var p = { x: 0, y: 0 }, prevP = { x: 0, y: 0 }, vs = { x: 0, y: 0 };
    var theta = REST, w = 0, op = 0;
    var mode = 'hidden', lastMove = 0, settleStart = 0;
    var running = false, prevNow = 0;

    function step() {
      var L = CFG.arm;
      var damp = mode === 'settling' ? CFG.settleDamping : CFG.damping;
      var vf = { x: p.x - prevP.x, y: p.y - prevP.y };
      prevP = { x: p.x, y: p.y };
      var nv = { x: vs.x * 0.5 + vf.x * 0.5, y: vs.y * 0.5 + vf.y * 0.5 };
      var a = { x: nv.x - vs.x, y: nv.y - vs.y };
      vs = nv;
      var s = Math.sin(theta), c = Math.cos(theta);
      var alpha = (CFG.weight / L) * Math.sin(REST - theta) // gravity back to rest
        + (s * a.x - c * a.y) / L                            // inertia from the mouse accelerating
        + (CFG.drag / L) * (s * vs.x - c * vs.y)             // air drag: trails while moving
        - damp * w;                                          // friction
      w = Math.max(-0.7, Math.min(0.7, w + alpha));
      theta += w;
    }

    function tick(now) {
      var frames = Math.max(1, Math.min(3, Math.round((now - prevNow) / 16.67)));
      prevNow = now;
      for (var i = 0; i < frames; i++) step();

      var target = 0;
      if (mode === 'moving') {
        target = 1;
        if (now - lastMove > CFG.stopDelay) { mode = 'settling'; settleStart = now; }
      } else if (mode === 'settling') {
        target = now - settleStart > CFG.fadeHold ? 0 : 1;
      }
      op += (target - op) * (target > op ? 0.22 : CFG.fadeOut);

      if (mode === 'settling' && target === 0 && op < 0.01) {
        op = 0; mode = 'hidden'; theta = REST; w = 0;
      }

      el.style.opacity = op.toFixed(3);
      el.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) rotate(' +
        (theta * 180 / Math.PI - 45).toFixed(2) + 'deg)';

      if (mode === 'hidden') { running = false; return; }
      requestAnimationFrame(tick);
    }

    function start() {
      if (running) return;
      running = true;
      prevNow = performance.now();
      requestAnimationFrame(tick);
    }

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var x = e.clientX, y = e.clientY;
      if (mode === 'hidden') { prevP = { x: x, y: y }; vs = { x: 0, y: 0 }; }
      if (Math.hypot(x - p.x, y - p.y) > 0.5) {
        lastMove = performance.now();
        mode = 'moving';
        start();
      }
      p = { x: x, y: y };
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      if (mode === 'moving') { mode = 'settling'; settleStart = performance.now() - 10000; }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
