/* Café Hygge — lighting, particles, and caption rendering */
(function () {
  'use strict';

  const SCENE = window.SCENE;
  const R = SCENE._;
  const W = R.W, H = R.H, L = R.L;
  const lerp = R.lerp;

  /* ================= LIGHTING & ATMOSPHERE ================= */

  SCENE.drawLighting = function (g, world) {
    const pal = world.pal, t = world.t;

    // day/night colour wash
    const nightC = [112, 120, 172], dayC = [255, 250, 242];
    const d = pal.daylight;
    const tint = [
      Math.round(lerp(nightC[0], dayC[0], d)),
      Math.round(lerp(nightC[1], dayC[1], d)),
      Math.round(lerp(nightC[2], dayC[2], d))
    ];
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgb(' + tint.join(',') + ')';
    g.fillRect(0, 0, W, H);

    // warm pools of light
    g.globalCompositeOperation = 'lighter';
    const lampA = pal.lamp;
    glow(g, L.lamp1.x, 96, 104, 255, 176, 84, 0.05 + 0.26 * lampA);
    glow(g, L.lamp2.x, 96, 104, 255, 176, 84, 0.05 + 0.26 * lampA);
    glow(g, L.lamp3.x, 96, 104, 255, 176, 84, 0.05 + 0.26 * lampA);
    // the counter pendant's spill: one pool over the machine + pass, one over
    // the pastry case, so the back bar stays warm after dark
    glow(g, 724, 248, 120, 255, 190, 100, 0.04 + 0.22 * lampA);
    glow(g, 866, 250, 120, 255, 190, 100, 0.04 + 0.22 * lampA);
    L.library.lamps.forEach(function (lp) {
      glow(g, lp.x, lp.y - 58, 64, 255, 190, 100, 0.04 + 0.3 * lampA);
    });
    // fire, always flickering
    const flick = 0.2 + 0.06 * Math.sin(t * 8.7) + 0.04 * Math.sin(t * 23.3);
    glow(g, 388, 204, 92, 255, 140, 50, flick);
    glow(g, 388, 212, 40, 255, 190, 90, flick * 0.8);
    // candle pools bloom only after Nora has lit their visible flames
    const mantel = world.candles ? world.candles.mantel : 0;
    glow(g, 385, 118, 20, 255, 200, 110, mantel * (0.1 + 0.06 * Math.sin(t * 11)));
    // window poseur tables carry no candle: cups only, cushions nearby
    world.tables.forEach(function (tb, i) {
      if (tb.tall) return;
      const a = tb.candle * (0.07 + 0.07 * (1 - d) + 0.025 * Math.sin(t * 9 + i * 2.1));
      glow(g, tb.x + (tb.small ? 7 : 0), tb.y - 14, 34, 255, 195, 105, a);
      tb.items.forEach(function (it) {
        if (it.kind === 'laptop' && it.open) {
          glow(g, tb.x + it.side * 12, tb.y - 13, 18, 120, 155, 215, 0.055 * (1 - d));
        }
      });
    });
    // daylight spilling in the windows (centred under L.win / L.win2)
    if (d > 0.1) {
      glow(g, 200, 236, 130, 255, 245, 215, 0.06 * d);
      glow(g, 524, 236, 130, 255, 245, 215, 0.06 * d);
    }

    // vignette (centred on the 16:9 crop; deepens a touch after dark)
    g.globalCompositeOperation = 'source-over';
    const vA = 0.34 + 0.12 * (1 - d);
    const v = g.createRadialGradient(W / 2, 286, 240, W / 2, 306, 620);
    v.addColorStop(0, 'rgba(16,10,6,0)');
    v.addColorStop(0.6, 'rgba(16,10,6,' + (vA * 0.35).toFixed(3) + ')');
    v.addColorStop(1, 'rgba(16,10,6,' + vA.toFixed(3) + ')');
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
  };

  function glow(g, x, y, r, cr, cg, cb, a) {
    if (a <= 0.005) return;
    const rad = g.createRadialGradient(x, y, 4, x, y, r);
    rad.addColorStop(0, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + a + ')');
    rad.addColorStop(1, 'rgba(' + cr + ',' + cg + ',' + cb + ',0)');
    g.fillStyle = rad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /* ---------- particles ---------- */
  SCENE.drawParticles = function (g, world) {
    world.particles.forEach(function (p) {
      const a = Math.max(0, 1 - p.age / p.life);
      if (p.type === 'steam') {
        const ph = p.age * 3 + p.seed;
        const sx = Math.round(p.x + Math.sin(ph) * 4), sy = Math.round(p.y);
        const grow = p.age / p.life;
        g.fillStyle = 'rgba(250,248,240,' + (a * 0.38).toFixed(3) + ')';
        if (grow < 0.3) {
          g.fillRect(sx, sy, 2, 2);
        } else {
          // little curl: head + trailing comma against the drift
          g.fillRect(sx, sy, 3, 3);
          g.fillRect(sx + (Math.cos(ph) > 0 ? -2 : 3), sy + 3, 2, 2);
          if (grow > 0.7) g.fillRect(sx + 1, sy - 2, 2, 2);
        }
      } else if (p.type === 'spark') {
        g.fillStyle = 'rgba(255,180,70,' + (a * 0.8).toFixed(3) + ')';
        g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
        g.fillStyle = 'rgba(255,120,40,' + (a * 0.35).toFixed(3) + ')';
        g.fillRect(Math.round(p.x), Math.round(p.y) + 3, 2, 2);
      } else if (p.type === 'mote') {
        const mx = Math.round(p.x + Math.sin(p.age * 4 + p.seed) * 5);
        const my = Math.round(p.y + Math.cos(p.age * 3 + p.seed) * 3);
        g.fillStyle = 'rgba(250,232,182,' + (a * 0.9).toFixed(3) + ')';
        g.fillRect(mx, my, 2, 2);
      } else if (p.type === 'drop') {
        g.fillStyle = 'rgba(126,174,188,' + (a * 0.75).toFixed(3) + ')';
        g.fillRect(Math.round(p.x), Math.round(p.y), 1, 2);
      }
    });
  };

  /* ---------- captions ----------
     Pixel-look without assets: the caption renders once (per text) at 10 px
     into a small offscreen canvas, gets thresholded to crisp 1-bit glyphs in
     the caption cream + shadow colors, and is blitted ×2 nearest-neighbour —
     a 20 px bitmap-style line that matches the art. */
  let capCache = { text: null, fill: null, back: null, w: 0, h: 0 };

  function buildCaption(text) {
    const fs = 10, baseline = 10, ch = 14, pad = 2;
    const meas = document.createElement('canvas');
    let mg = meas.getContext('2d');
    mg.font = fs + 'px monospace';
    const cw = Math.ceil(mg.measureText(text).width) + pad * 2;
    meas.width = cw; meas.height = ch;             // resizing resets the ctx state
    mg = meas.getContext('2d');
    mg.font = fs + 'px monospace';
    mg.fillStyle = '#fff';
    mg.fillText(text, pad, baseline);
    const src = mg.getImageData(0, 0, cw, ch).data;
    const fill = document.createElement('canvas'); fill.width = cw; fill.height = ch;
    const back = document.createElement('canvas'); back.width = cw; back.height = ch;
    const fg = fill.getContext('2d'), bg = back.getContext('2d');
    const fi = fg.createImageData(cw, ch), bi = bg.createImageData(cw, ch);
    for (let i = 0; i < cw * ch; i++) {
      if (src[i * 4 + 3] > 100) {
        fi.data[i * 4] = 240; fi.data[i * 4 + 1] = 225; fi.data[i * 4 + 2] = 195; fi.data[i * 4 + 3] = 255;
        bi.data[i * 4] = 10; bi.data[i * 4 + 1] = 6; bi.data[i * 4 + 2] = 4; bi.data[i * 4 + 3] = 255;
      }
    }
    fg.putImageData(fi, 0, 0); bg.putImageData(bi, 0, 0);
    capCache = { text: text, fill: fill, back: back, w: cw, h: ch };
  }

  SCENE.drawCaption = function (g, world) {
    const c = world.activeCaption;
    if (!c) return;
    if (capCache.text !== c.text) buildCaption(c.text);
    const age = world.t - c.born;
    const dur = 4.4;
    let a = 1;
    if (age < 0.4) a = age / 0.4;
    else if (age > dur - 0.8) a = Math.max(0, (dur - age) / 0.8);
    g.globalAlpha = a * 0.75;
    g.drawImage(capCache.back, 18, 542, capCache.w * 2, capCache.h * 2);
    g.globalAlpha = a * 0.95;
    g.drawImage(capCache.fill, 16, 540, capCache.w * 2, capCache.h * 2);
    g.globalAlpha = 1;
  };
})();
