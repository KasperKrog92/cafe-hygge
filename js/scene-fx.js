/* Café Hygge — lighting, particles, and caption rendering */
(function () {
  'use strict';

  const SCENE = window.SCENE;
  const R = SCENE._;
  const W = R.W, H = R.H, L = R.L;
  const lerp = R.lerp;

  /* ================= LIGHTING & ATMOSPHERE ================= */

  // The map contains illumination only, so moving people, books and contact
  // shadows receive the same local light without baking any sprites into it.
  const cafeLight = { key: null, canvas: null };

  function lightPool(g, p) {
    g.save(); g.translate(p.x, p.y); g.scale(p.rx, p.ry);
    const light = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    light.addColorStop(0, 'rgba(' + p.color + ',' + p.a + ')');
    light.addColorStop(0.32, 'rgba(' + p.color + ',' + (p.a * 0.86) + ')');
    light.addColorStop(1, 'rgba(' + p.color + ',0)');
    g.fillStyle = light; g.fillRect(-1, -1, 2, 2); g.restore();
  }

  SCENE.drawLighting = function (g, world) {
    const pal = world.pal, t = world.t, d = pal.daylight, dark = 1 - d;
    const nightC = [112, 120, 172], dayC = [255, 250, 242];
    const tint = nightC.map(function (c, i) { return Math.round(lerp(c, dayC[i], d)); });
    const lampA = SCENE.lampLevel(world), power = world.shop ? world.shop.lights : 1;
    const warm = '255,226,188', fireColor = '255,208,155', pools = [];
    function pool(x, y, rx, ry, a, color) {
      // Tiny intensity steps bound cache churn during the slow day/candle fade.
      a = Math.round(a * dark * 128) / 128;
      if (a > 0) pools.push({ x: x, y: y, rx: rx, ry: ry, a: a, color: color || warm });
    }
    const pendants = L.pendants.filter(function (p, i) { return i === 0 || SCENE.pendantsLit(world); });
    pendants.forEach(function (lp) {
      pool(lp.x, L.counter.slabY - 30, 132, 100, 0.92 * lampA);
    });
    SCENE.activeGeometry(world, L.library.lamps).forEach(function (lp) {
      const i = L.library.lamps.indexOf(lp), chair = L.library.chairs[i];
      // Light falls from the fixed lamp toward its reading place; it never
      // follows a sitter. The broad lower pool reaches book, hands and fabric.
      pool(Math.round((lp.x + chair.x) / 2), lp.y - 28, 108, 84, 0.94 * lampA);
    });
    if (SCENE.hasFurniture(world, 'piano'))
      pool(L.piano.lamp.x + 14, L.piano.lamp.y + 23, 58, 62, 0.86 * lampA);
    if (SCENE.hasFurniture(world, 'studio'))
      pool(Math.round((L.artist.lamp.x + L.artist.easel.x) / 2), L.artist.lamp.y - 36, 92, 78, 0.9 * lampA);
    const fireLvl = world.fire ? world.fire.level : 1;
    const fireOn = !SCENE.hearthWork(world);
    const fireX = L.fire.boxX + L.fire.boxW / 2, fireY = L.fire.boxBot - 20;
    if (fireOn) {
      pool(fireX, fireY, 82, 76, 0.92 * (0.16 + 0.84 * fireLvl), fireColor);
      pool(fireX, L.fire.boxBot + 43, 174, 90, 0.9 * (0.1 + 0.9 * fireLvl), fireColor);
    }
    const mantel = SCENE.hasFurniture(world, 'mantel-decor') && world.candles ? world.candles.mantel : 0;
    pool(fireX - 3, 128, 40, 38, 0.5 * mantel, fireColor);
    world.tables.forEach(function (tb) {
      if (tb.tall || tb.piano) return;
      if (SCENE.readingLamp(world, tb)) pool(tb.x - 12, tb.y - 24, 76, 65, 0.9 * lampA);
      pool(tb.x + (tb.small ? 7 : 0), tb.y - 14, 46, 40, 0.5 * tb.candle, fireColor);
      tb.items.forEach(function (it) {
        if (it.kind === 'laptop' && it.open && !it.hidden) {
          const laptop = SCENE.laptopGeometry(tb.x, tb.y, it.side);
          pool(laptop.screenX, laptop.screenY, 22, 22, 0.2, '176,205,240');
        }
      });
    });
    const openings = [L.win, L.win2].filter(function (w) { return SCENE.windowOpen(world, w); });
    const key = tint.join(',') + ':' + JSON.stringify(pools) + ':' + openings.map(function (w) { return w.x; }).join(',');
    if (cafeLight.key !== key) {
      if (!cafeLight.canvas) {
        cafeLight.canvas = document.createElement('canvas');
        cafeLight.canvas.width = W; cafeLight.canvas.height = H;
      }
      const m = cafeLight.canvas.getContext('2d');
      m.fillStyle = 'rgb(' + tint.join(',') + ')'; m.fillRect(0, 0, W, H);
      pools.forEach(function (p) { lightPool(m, p); });
      // Indoor lamps do not wash over the distant town. Keep its existing
      // time-of-day treatment, including while curtains cover the opening.
      m.fillStyle = 'rgb(' + tint.join(',') + ')';
      openings.forEach(function (w) { m.fillRect(w.x, w.y, w.w, w.h); });
      cafeLight.key = key;
    }
    g.save();
    g.globalCompositeOperation = 'multiply'; g.drawImage(cafeLight.canvas, 0, 0);

    // Compact blooms identify luminous sources; the multiply map above lights
    // surfaces without raising every dark seam into an amber veil.
    g.globalCompositeOperation = 'lighter';
    pendants.forEach(function (lp) {
      g.save(); g.beginPath(); g.rect(lp.x - 32, lp.y + 2, 64, 36); g.clip();
      glow(g, lp.x, lp.y + 4, 28, 255, 190, 100, 0.14 * lampA); g.restore();
    });
    SCENE.activeGeometry(world, L.library.lamps).forEach(function (lp) {
      glow(g, lp.x, lp.y - 58, 27, 255, 200, 125, (0.025 + 0.15 * pal.lamp) * power);
    });
    if (SCENE.hasFurniture(world, 'piano'))
      glow(g, L.piano.lamp.x, L.piano.lamp.y, 15, 255, 200, 125, (0.02 + 0.12 * pal.lamp) * power);
    if (SCENE.hasFurniture(world, 'studio'))
      glow(g, L.artist.lamp.x + 1, L.artist.lamp.y - 58, 27, 255, 200, 125, (0.025 + 0.15 * pal.lamp) * power);
    const flick = fireOn ? (0.06 + 0.1 * fireLvl) + 0.025 * fireLvl * Math.sin(t * 8.7) + 0.01 * fireLvl * Math.sin(t * 23.3) : 0;
    const dayFire = fireOn ? ((0.06 + 0.16 * fireLvl) + (0.04 + 0.05 * fireLvl) * Math.sin(t * 8.7) + 0.03 * fireLvl * Math.sin(t * 23.3)) * d : 0;
    glow(g, fireX, fireY - 4, 52 + 40 * fireLvl, 255, 140, 50, dayFire);
    glow(g, fireX, fireY + 4, 24 + 16 * fireLvl, 255, 190, 90, dayFire * 0.8);
    glow(g, fireX, fireY, 26 + 20 * fireLvl, 255, 155, 65, flick * dark);
    glow(g, fireX - 3, 128, 14, 255, 200, 110, mantel * (0.07 + 0.03 * Math.sin(t * 11)));
    world.tables.forEach(function (tb, i) {
      if (tb.tall || tb.piano) return;
      if (SCENE.readingLamp(world, tb))
        glow(g, tb.x - 1, tb.y - 26, 18, 255, 200, 125, (0.02 + 0.13 * pal.lamp) * power);
      glow(g, tb.x + (tb.small ? 7 : 0), tb.y - 14, 18, 255, 195, 105,
        tb.candle * (0.045 + 0.035 * dark + 0.015 * Math.sin(t * 9 + i * 2.1)));
      tb.items.forEach(function (it) {
        if (it.kind === 'laptop' && it.open && !it.hidden) {
          const laptop = SCENE.laptopGeometry(tb.x, tb.y, it.side);
          glow(g, laptop.screenX, laptop.screenY, 14, 120, 155, 215, 0.035 * dark);
        }
      });
    });
    [L.win, L.win2].forEach(function (w, i) {
      const beam = SCENE.windowLight(world, w);
      glow(g, w.x + w.w / 2 + beam.shift / 2, L.wallY + beam.depth / 3,
        130, 255, 235, 195, 0.065 * beam.strength * (1 - (world.shop ? world.shop.curtains[i] : 0)));
    });
    const flashA = (world.flash || 0) * dark * 0.08;
    glow(g, L.win.x + L.win.w / 2, 238, 112, 176, 205, 255, flashA);
    glow(g, L.win2.x + L.win2.w / 2, 238, 112, 176, 205, 255, flashA);

    // vignette (centred on the 16:9 crop; deepens a touch after dark)
    g.globalCompositeOperation = 'source-over';
    const vA = 0.34 + 0.12 * dark;
    const v = g.createRadialGradient(W / 2, 286, 240, W / 2, 306, 620);
    v.addColorStop(0, 'rgba(16,10,6,0)');
    v.addColorStop(0.6, 'rgba(16,10,6,' + (vA * 0.35).toFixed(3) + ')');
    v.addColorStop(1, 'rgba(16,10,6,' + vA.toFixed(3) + ')');
    g.fillStyle = v; g.fillRect(0, 0, W, H); g.restore();
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
    document.fonts.load('24px "Jersey 10"').then(function () {
      capCache.text = null;
    }).catch(function () { /* A local fallback keeps captions available. */ });
  }

  function buildCaption(text) {
    const pad = 10, lineHeight = 26, maxWidth = 540;
    const card = document.createElement('canvas');
    let g = card.getContext('2d');
    const font = '24px "Jersey 10", monospace';
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
    const room = SCENE.presentation(world);
    g.drawImage(capCache.canvas, 24, room.h - 32 - capCache.canvas.height);
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
    if (world.shop.phase === 'home') { SCENE.drawHome(g, world); return; }
    SCENE.drawScene(g, world);
    const furniture = SCENE.furnitureDrawables(world).concat(SCENE.plantDrawables(world));
    const ents = SIM.entityDrawables(world);
    const all = furniture.concat(ents.draws);
    all.sort(function (a, b) { return a.y - b.y; });
    all.forEach(function (d) { d.draw(g); });
    SCENE.drawParticles(g, world);
    SCENE.drawLighting(g, world);
    ents.bubbles.forEach(function (b) {
      g.save();g.globalAlpha=b.alpha===undefined?1:b.alpha;SCENE.drawBubble(g,b.x,b.y,b.icon);g.restore();
    });
    if(!world.dialogue)SCENE.drawCaption(g, world);
    if(SCENE.drawIntroDialogue)SCENE.drawIntroDialogue(g,world);
    if (world.shop && world.shop.fade > 0) {
      g.fillStyle = '#100d14'; g.globalAlpha = world.shop.fade;
      g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    }
  };
})();
