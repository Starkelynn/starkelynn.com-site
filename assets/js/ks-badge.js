/* =====================================================================
   KS BADGE ORBIT — fixed branded asset. NEVER modify. Checksum-guarded.
   Extracted 1:1 from the shipped schweizerumzuege-site implementation
   (factory canonicalization, 2026-08-04); wrapped self-contained with
   its own reduced-motion check.
   ===================================================================== */
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var initBadgeOrbit = function () {
    var orbits = document.querySelectorAll('[data-badge-orbit]');
    if (!orbits.length) return;

    var normalizeLength = function (value, fallback) {
      var parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    var normalizeDuration = function (value, fallback) {
      var parsed = Number.parseFloat(value);
      if (!Number.isFinite(parsed)) return fallback;
      return value.trim().endsWith('ms') ? parsed : parsed * 1000;
    };

    orbits.forEach(function (orbit) {
      var rail = orbit.querySelector('.site-footer__badge-orbit-rail');
      var traces = Array.from(orbit.querySelectorAll('.site-footer__badge-orbit-trace'));
      if (!rail || traces.length < 2 || typeof rail.getTotalLength !== 'function') return;

      var badge = orbit.closest('.site-footer__badge') || orbit;
      var styles = window.getComputedStyle(badge);
      var total = rail.getTotalLength();
      var baseTraceLength = total * (normalizeLength(styles.getPropertyValue('--badge-trace-length'), 8) / 100);
      var baseOpacity = normalizeLength(styles.getPropertyValue('--badge-trace-opacity'), 0.67);
      var duration = normalizeDuration(styles.getPropertyValue('--badge-orbit-duration'), 6800);
      var animationFrame = 0;
      var lastTimestamp = 0;
      var distance = 0;

      var pointAt = function (d) {
        var normalized = ((d % total) + total) % total;
        return rail.getPointAtLength(normalized);
      };

      var sideBiasAt = function (d) {
        var phase = (((d / total) % 1) + 1) % 1;
        var sideBias = Math.sin(phase * Math.PI * 2);
        return sideBias * sideBias;
      };

      var getMotionState = function (d) {
        var sideBias = sideBiasAt(d);
        return {
          length: baseTraceLength * (0.5 + sideBias * 1.5),
          opacity: Math.min(1, baseOpacity * (1 + sideBias * 0.5)),
          speed: 0.5 + sideBias * 1.5
        };
      };

      var buildTrace = function (center, length) {
        var path = '';
        var steps = Math.max(10, Math.ceil(length / 1.25));
        var start = center - length / 2;
        for (var index = 0; index <= steps; index += 1) {
          var point = pointAt(start + (length * index) / steps);
          var command = index === 0 ? 'M' : 'L';
          path += command + ' ' + point.x.toFixed(2) + ' ' + point.y.toFixed(2) + ' ';
        }
        return path.trim();
      };

      var draw = function (d) {
        var state = getMotionState(d);
        traces[0].setAttribute('d', buildTrace(d, state.length));
        traces[1].setAttribute('d', buildTrace(d + total / 2, state.length));
        traces.forEach(function (trace) {
          trace.style.opacity = state.opacity.toFixed(3);
        });
      };

      draw(0);
      orbit.classList.add('is-ready');

      if (prefersReducedMotion) return;

      var tick = function (timestamp) {
        if (!lastTimestamp) lastTimestamp = timestamp;
        var elapsed = timestamp - lastTimestamp;
        var state = getMotionState(distance);
        distance = (distance + (total * elapsed * state.speed) / duration) % total;
        draw(distance);
        lastTimestamp = timestamp;
        animationFrame = window.requestAnimationFrame(tick);
      };

      animationFrame = window.requestAnimationFrame(tick);

      document.addEventListener('visibilitychange', function () {
        if (document.hidden && animationFrame) {
          window.cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        } else if (!document.hidden && !animationFrame) {
          lastTimestamp = 0;
          animationFrame = window.requestAnimationFrame(tick);
        }
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBadgeOrbit);
  } else {
    initBadgeOrbit();
  }
})();
