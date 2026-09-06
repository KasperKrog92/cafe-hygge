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
    const lampA = SCENE.lampLevel(world), power = world.shop ? world.shop.lights : 1;
    L.pendants.forEach(function (lp) {
      // Shade contains the source: modest bloom below its rim, with the
      // useful light directly beneath it on the counter, not across the wall.
      g.save();
      g.beginPath();
      g.rect(lp.x - 48, lp.y + 2, 96, 60);
      g.clip();
      glow(g, lp.x, lp.y + 4, 48, 255, 190, 100, 0.18 * lampA);
      g.restore();
      glow(g, lp.x, L.counter.slabY - 16, 112, 255, 190, 100, 0.26 * lampA);
    });
    L.library.lamps.forEach(function (lp) {
      glow(g, lp.x, lp.y - 58, 64, 255, 190, 100, (0.04 + 0.3 * pal.lamp) * power);
    });
    glow(g, L.piano.lamp.x, L.piano.lamp.y, 22, 255, 190, 100, (0.03 + 0.28 * pal.lamp) * power);
    // the studio floor lamp pools over the easel so the canvas stays readable after dark
    glow(g, L.artist.lamp.x + 8, L.artist.lamp.y - 56, 64, 255, 190, 100, (0.04 + 0.3 * pal.lamp) * power);
    // fire: its warm pool grows and brightens with the live burn, and shrinks
    // to a small ember glow when low — but never goes fully dark
    const fireLvl = world.fire ? world.fire.level : 1;
    const flick = (0.06 + 0.16 * fireLvl) + (0.04 + 0.05 * fireLvl) * Math.sin(t * 8.7) + 0.03 * fireLvl * Math.sin(t * 23.3);
    glow(g, 388, 204, 52 + 40 * fireLvl, 255, 140, 50, flick);
    glow(g, 388, 212, 24 + 16 * fireLvl, 255, 190, 90, flick * 0.8);
    // candle pools bloom only after Nora has lit their visible flames
    const mantel = world.candles ? world.candles.mantel : 0;
    glow(g, 385, 118, 20, 255, 200, 110, mantel * (0.1 + 0.06 * Math.sin(t * 11)));
    // window poseur tables carry no candle: cups only, cushions nearby
    world.tables.forEach(function (tb, i) {
      if (tb.tall || tb.piano) return;
      const a = tb.candle * (0.07 + 0.07 * (1 - d) + 0.025 * Math.sin(t * 9 + i * 2.1));
      glow(g, tb.x + (tb.small ? 7 : 0), tb.y - 14, 34, 255, 195, 105, a);
      tb.items.forEach(function (it) {
        if (it.kind === 'laptop' && it.open) {
          const laptop = SCENE.laptopGeometry(tb.x, tb.y, it.side);
          glow(g, laptop.screenX, laptop.screenY, 18, 120, 155, 215, 0.055 * (1 - d));
        }
      });
    });
    // Same moving source and weather attenuation as the floor projections.
    [L.win, L.win2].forEach(function (w, i) {
      const beam = SCENE.windowLight(world, w);
      glow(g, w.x + w.w / 2 + beam.shift / 2, L.wallY + beam.depth / 3,
        130, 255, 235, 195, 0.065 * beam.strength * (1 - (world.shop ? world.shop.curtains[i] : 0)));
    });
    // A storm flash is a cool reflection below the windows, visible mostly
    // after dark; it never becomes a full-screen strobe.
    const flashA = (world.flash || 0) * (1 - d) * 0.08;
    glow(g, L.win.x + L.win.w / 2, 238, 112, 176, 205, 255, flashA);
    glow(g, L.win2.x + L.win2.w / 2, 238, 112, 176, 205, 255, flashA);

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
     Keep normal antialiased letterforms: thresholding a tiny platform font
     can erase strokes differently across platform fonts. Cache the measured,
     wrapped text with an outline and shadow to separate it from the floor. */
  let capCache = { text: null, canvas: null };
  // Canvas does not reflow when a webfont arrives: rebuild any fallback caption.
  if (document.fonts) {
    document.fonts.load('20px "Patrick Hand"').then(function () {
      capCache.text = null;
    }).catch(function () { /* A local fallback keeps captions available. */ });
  }

  function buildCaption(text) {
    const pad = 10, lineHeight = 26, maxWidth = 540;
    const card = document.createElement('canvas');
    let g = card.getContext('2d');
    const font = '20px "Patrick Hand", "Comic Sans MS", cursive';
    g.font = font;
    const lines = [], words = text.split(/\s+/);
    let line = '';
    words.forEach(function (word) {
      const next = line ? line + ' ' + word : word;
      if (line && g.measureText(next).width > maxWidth) {
        lines.push(line); line = word;
      } else line = next;
    });
    if (line) lines.push(line);
    const width = Math.ceil(Math.max(0, ...lines.map(function (row) { return g.measureText(row).width; })));
    card.width = width + pad * 2;
    card.height = lines.length * lineHeight + pad * 2;
    g = card.getContext('2d');
    g.font = font;
    g.textBaseline = 'middle';
    g.fillStyle = '#f0e1c3';
    g.strokeStyle = '#14100e';
    g.lineWidth = 3;
    g.lineJoin = 'round';
    lines.forEach(function (row, i) {
      const y = pad + i * lineHeight + lineHeight / 2;
      g.shadowColor = 'rgba(10, 6, 4, 0.7)';
      g.shadowBlur = 2;
      g.shadowOffsetY = 1;
      g.strokeText(row, pad, y);
      // Keep the cream letter interiors clean; only the outline casts a shadow.
      g.shadowColor = 'transparent';
      g.fillText(row, pad, y);
    });
    capCache = { text: text, canvas: card };
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
    g.save();
    g.globalAlpha = a;
    g.drawImage(capCache.canvas, 24, 568 - capCache.canvas.height);
    g.restore();
  };

  /* Compose one full frame of the world into `g` (a 960×600 master context):
     background, the baseline-sorted furniture+entity draw list, particles,
     lighting, bubbles, caption. The single source of the depth-sort render
     pass — main.js's render() calls this then blits the view rect to the
     visible canvas, and __dev.shot() calls it into an offscreen canvas, so a
     headless shot can never drift from what actually ships. Property-accesses
     SIM.entityDrawables / SCENE.drawCaption at call time, so the dev overlay's
     drawCaption wrap (js/dev.js) rides along on shots too. */
  SCENE.composeFrame = function (g, world) {
    SCENE.drawScene(g, world);
    const furniture = SCENE.furnitureDrawables(world);
    const ents = SIM.entityDrawables(world);
    const all = furniture.concat(ents.draws);
    all.sort(function (a, b) { return a.y - b.y; });
    all.forEach(function (d) { d.draw(g); });
    SCENE.drawParticles(g, world);
    SCENE.drawLighting(g, world);
    ents.bubbles.forEach(function (b) { SCENE.drawBubble(g, b.x, b.y, b.icon); });
    SCENE.drawCaption(g, world);
    if (world.shop && world.shop.fade > 0) {
      g.fillStyle = '#100d14'; g.globalAlpha = world.shop.fade;
      g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    }
  };
})();
