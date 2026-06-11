/*
  Anthony Luo — personal site
  Topographic contour canvas · theme toggle.
  Vanilla JS, no dependencies, no build step.
*/
(function () {
  "use strict";

  var root = document.documentElement;
  var finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  var reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Topographic contour canvas ---------- */

  var field = (function () {
    var canvas = document.getElementById("field");
    var ctx = canvas.getContext("2d");

    /* Hairline iso-lines of a slowly evolving scalar field — a gentle ramp
       with a few drifting hills — traced with marching squares, like the
       contours of a terrain map (or a loss landscape). The cursor raises a
       small hill of its own: nearby lines bow around it and the closest
       ones warm to the accent color. */
    var CELL = 18;          /* sampling grid pitch, px */
    var LINE_W = 0.8;       /* hairline stroke width */
    var CONTOUR_GAP = 60;   /* target spacing between lines, px */
    var CURSOR_SIGMA = 95;  /* radius of the cursor hill */
    var ACCENT_SIGMA = 110; /* falloff of the accent tint around the cursor */

    /* drifting hills: amplitude, width (fraction of the short viewport
       side), orbital speeds (rad/ms — periods of 2–4 minutes), phases */
    var HILLS = [
      { amp: 0.26, w: 0.45, fx: 0.000043, fy: 0.000031, px: 0.0, py: 2.1 },
      { amp: -0.22, w: 0.38, fx: 0.000029, fy: 0.000047, px: 4.2, py: 0.7 },
      { amp: 0.19, w: 0.52, fx: 0.000037, fy: 0.000023, px: 1.3, py: 3.9 }
    ];

    /* marching-squares cases → contour segments as pairs of edge indices
       (0 top, 1 right, 2 bottom, 3 left); corner bits 1·TL 2·TR 4·BR 8·BL */
    var SEGS = [
      null,
      [0, 3], [0, 1], [3, 1],
      [1, 2], [0, 3, 1, 2], [0, 2], [3, 2],
      [3, 2], [0, 2], [0, 1, 2, 3], [1, 2],
      [3, 1], [0, 1], [0, 3], null
    ];

    var W, H, S, step, cursorAmp, cols, rows, vals, colors;
    var raf = null, last = 0, t = 0;
    var mx = 0, my = 0, sx = 0, sy = 0, pointerSeen = false;
    var pt = [0, 0]; /* scratch for edge interpolation */

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      S = Math.min(W, H);
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / CELL) + 1;
      rows = Math.ceil(H / CELL) + 1;
      vals = new Float32Array(cols * rows);
      /* the ramp gradient is ~0.75/S, so this keeps line spacing at
         CONTOUR_GAP px regardless of viewport size */
      step = (CONTOUR_GAP * 0.7515) / S;
      cursorAmp = 0.9 * step; /* the cursor bends lines by about one level */
      if (reducedMotion.matches) draw();
    }

    function refreshColors() {
      var style = getComputedStyle(root);
      colors = {
        line: style.getPropertyValue("--field-line").trim(),
        accent: style.getPropertyValue("--field-accent").trim(),
        lineAlpha: parseFloat(style.getPropertyValue("--field-line-alpha")) || 0.08,
        accentAlpha: parseFloat(style.getPropertyValue("--field-accent-alpha")) || 0.25
      };
      if (reducedMotion.matches) draw();
    }

    function edgePoint(e, x0, y0, lvl, v00, v10, v01, v11) {
      var r;
      if (e === 0) { r = (lvl - v00) / (v10 - v00); pt[0] = x0 + r * CELL; pt[1] = y0; }
      else if (e === 1) { r = (lvl - v10) / (v11 - v10); pt[0] = x0 + CELL; pt[1] = y0 + r * CELL; }
      else if (e === 2) { r = (lvl - v01) / (v11 - v01); pt[0] = x0 + r * CELL; pt[1] = y0 + CELL; }
      else { r = (lvl - v00) / (v01 - v00); pt[0] = x0; pt[1] = y0 + r * CELL; }
    }

    function draw() {
      if (!colors) return;
      ctx.clearRect(0, 0, W, H);
      var k;

      /* hill positions for this frame (slow Lissajous orbits + breathing) */
      var hx = [], hy = [], hdiv = [], hamp = [];
      for (k = 0; k < HILLS.length; k++) {
        var h = HILLS[k];
        hx[k] = (0.5 + 0.4 * Math.sin(t * h.fx + h.px)) * W;
        hy[k] = (0.5 + 0.4 * Math.sin(t * h.fy + h.py)) * H;
        hdiv[k] = 2 * (h.w * S) * (h.w * S);
        hamp[k] = h.amp * (1 + 0.12 * Math.sin(t * 0.00005 + k * 2.1));
      }
      var curDiv = 2 * CURSOR_SIGMA * CURSOR_SIGMA;
      var accDiv = 2 * ACCENT_SIGMA * ACCENT_SIGMA;
      var accCut = 9 * ACCENT_SIGMA * ACCENT_SIGMA;

      /* pass 1: sample the field on the grid */
      var i, j, idx = 0;
      var min = Infinity, max = -Infinity;
      for (j = 0; j < rows; j++) {
        var y = j * CELL;
        for (i = 0; i < cols; i++, idx++) {
          var x = i * CELL;
          var f = (0.32 * x + 0.68 * y) / S;
          for (k = 0; k < HILLS.length; k++) {
            var dx = x - hx[k], dy = y - hy[k];
            f += hamp[k] * Math.exp(-(dx * dx + dy * dy) / hdiv[k]);
          }
          if (pointerSeen) {
            var ux = x - sx, uy = y - sy;
            f += cursorAmp * Math.exp(-(ux * ux + uy * uy) / curDiv);
          }
          vals[idx] = f;
          if (f < min) min = f;
          if (f > max) max = f;
        }
      }

      /* pass 2: trace each contour level with marching squares */
      ctx.lineWidth = LINE_W;
      ctx.strokeStyle = colors.line;
      ctx.globalAlpha = colors.lineAlpha;
      var accents = []; /* segments near the cursor, redrawn in accent */
      var lvl0 = Math.ceil(min / step) * step;
      for (var lvl = lvl0; lvl < max; lvl += step) {
        ctx.beginPath();
        for (j = 0; j < rows - 1; j++) {
          for (i = 0; i < cols - 1; i++) {
            var i00 = j * cols + i;
            var v00 = vals[i00], v10 = vals[i00 + 1];
            var v01 = vals[i00 + cols], v11 = vals[i00 + cols + 1];
            var c = 0;
            if (v00 > lvl) c |= 1;
            if (v10 > lvl) c |= 2;
            if (v11 > lvl) c |= 4;
            if (v01 > lvl) c |= 8;
            var seg = SEGS[c];
            if (!seg) continue;
            var x0 = i * CELL, y0 = j * CELL;
            for (k = 0; k < seg.length; k += 2) {
              edgePoint(seg[k], x0, y0, lvl, v00, v10, v01, v11);
              var ax = pt[0], ay = pt[1];
              edgePoint(seg[k + 1], x0, y0, lvl, v00, v10, v01, v11);
              ctx.moveTo(ax, ay);
              ctx.lineTo(pt[0], pt[1]);
              if (pointerSeen) {
                var ex = (ax + pt[0]) / 2 - sx, ey = (ay + pt[1]) / 2 - sy;
                var d2 = ex * ex + ey * ey;
                if (d2 < accCut) accents.push(ax, ay, pt[0], pt[1], Math.exp(-d2 / accDiv));
              }
            }
          }
        }
        ctx.stroke();
      }

      /* pass 3: re-stroke the lines under the cursor in the accent color */
      if (accents.length) {
        ctx.strokeStyle = colors.accent;
        for (k = 0; k < accents.length; k += 5) {
          ctx.globalAlpha = colors.accentAlpha * accents[k + 4];
          ctx.beginPath();
          ctx.moveTo(accents[k], accents[k + 1]);
          ctx.lineTo(accents[k + 2], accents[k + 3]);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      var dt = Math.min(now - last, 50); /* clamp background-tab gaps */
      last = now;
      t += dt;
      if (pointerSeen) {
        sx += (mx - sx) * 0.08;
        sy += (my - sy) * 0.08;
      }
      draw();
    }

    function start() {
      if (reducedMotion.matches) {
        draw(); /* one static frame, no animation */
        return;
      }
      if (raf === null) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }

    function stop() {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });
    if (reducedMotion.addEventListener) {
      reducedMotion.addEventListener("change", function () {
        stop();
        start();
      });
    }
    if (finePointer.matches) {
      window.addEventListener("pointermove", function (e) {
        mx = e.clientX;
        my = e.clientY;
        if (!pointerSeen) {
          pointerSeen = true;
          sx = mx;
          sy = my;
        }
      }, { passive: true });
    }

    refreshColors();
    resize();
    start();

    return { refreshColors: refreshColors };
  })();

  /* ---------- Theme toggle ---------- */

  (function () {
    var btn = document.getElementById("theme-toggle");
    var meta = document.querySelector('meta[name="theme-color"]');

    function setLabel() {
      var dark = root.getAttribute("data-theme") === "dark";
      btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    }

    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) { }
      if (meta) meta.setAttribute("content", next === "dark" ? "#0f1115" : "#ffffff");
      setLabel();
      field.refreshColors();
    });

    setLabel();
  })();
})();
