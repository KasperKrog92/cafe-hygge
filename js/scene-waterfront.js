/* Café Hygge — one small waterfront, seen through both panes. */
(function () {
  'use strict';
  const S = window.SCENE, L = S.L, F = L.waterfront;
  const px = S._.px, ell = S._.ell, shade = S._.shade, h2 = S._.h2;
  const PAINT = '#b5654a';
  const houses = [
    [113, 113, 30, '#c9b28a'], [144, 111, 20, '#b88a62'],
    [F.house.x, F.house.y, F.house.w, '#718b91'], [207, 115, 29, '#b5654a'],
    [239, 109, 31, '#c9a04a'], [273, 115, 30, '#a8b8aa'],
    [310, 106, 38, '#b88a62'], [352, 116, 28, '#8a9a8a'],
    [387, 109, 34, '#c9b28a'], [426, 115, 26, '#b5654a'],
    [455, 112, 34, '#c9a04a'], [492, 103, 36, '#b88a62'],
    [531, 114, 27, '#a8b8aa'], [561, 108, 28, '#b5654a'],
    [592, 115, 34, '#c9b28a'], [629, 110, 34, '#718b91']
  ];
  function clamp(n) { return Math.max(0, Math.min(1, n)); }
  function tone(c, world) { return shade(c, -Math.round((1 - world.daylight) * 6) / 10); }

  // Shared by the sky and both indoor light passes. One sun crosses the
  // whole view, including the wall between panes; no duplicate suns.
  S.sunPosition = function (hour) {
    const q = clamp((hour - 6) / 14);
    return { x: Math.round(F.x0 + 26 + q * (F.x1 - F.x0 - 52)),
      y: Math.round(F.skyY + 40 - Math.sin(q * Math.PI) * 28),
      height: Math.sin(q * Math.PI), visible: hour >= 6 && hour < 20 };
  };
  S.windowLight = function (world, w) {
    const sun = S.sunPosition(world.hour);
    return { shift: Math.round((w.x + w.w / 2 - sun.x) * 0.3),
      depth: Math.round(70 + (1 - sun.height) * 95),
      strength: sun.visible ? world.daylight * (1 - world.rain * 0.9) : 0 };
  };

  function sky(g, world) {
    const t = world.t, pal = world.pal;
    const grad = g.createLinearGradient(0, F.skyY, 0, F.bankY);
    grad.addColorStop(0, pal.skyTop); grad.addColorStop(1, pal.skyBot);
    g.fillStyle = grad; g.fillRect(F.x0, F.skyY, F.x1 - F.x0, F.bankY - F.skyY);
    const night = clamp((0.52 - world.daylight) / 0.52) * (1 - world.rain * 0.9);
    if (night > 0) {
      for (let i = 0; i < 30; i++) {
        const x = F.x0 + Math.round(h2(i, 31) * (F.x1 - F.x0));
        const y = F.skyY + 6 + Math.round(h2(i, 72) * 31);
        g.globalAlpha = night * (0.45 + 0.2 * Math.sin(t * 0.15 + i));
        px(g, x, y, 2, 2, '#e8ecf5');
      }
      const q = ((world.hour - 18 + 24) % 24) / 12;
      if (q <= 1) {
        const x = Math.round(F.x0 + 60 + q * (F.x1 - F.x0 - 120));
        const y = Math.round(F.skyY + 31 - Math.sin(q * Math.PI) * 17);
        g.globalAlpha = night;
        ell(g, x, y, 6, 6, '#e8e4d0');
        px(g, x + 1, y - 3, 3, 3, '#b8bfc7');
      }
    }
    const sun = S.sunPosition(world.hour);
    if (sun.visible) {
      g.globalAlpha = clamp((20 - world.hour) * 2) * (1 - world.rain * 0.92);
      ell(g, sun.x, sun.y, 7, 7, '#f8dc8a');
      px(g, sun.x - 3, sun.y - 4, 6, 2, '#f5e8bc');
    }
    // Broad soft cloud shapes, slowly crossing the same sky coordinates.
    for (let i = 0; i < 6; i++) {
      const x = F.x0 - 70 + ((i * 131 + t * (0.65 + i * 0.04)) % (F.x1 - F.x0 + 140));
      const y = F.skyY + 12 + (i % 3) * 10;
      g.globalAlpha = 0.22 + world.rain * 0.32;
      const c = world.rain > 0.4 ? '#b8bfc7' : '#e8ecdf';
      px(g, x + 11, y - 4, 17, 4, c); px(g, x + 5, y, 36, 4, c);
      px(g, x, y + 4, 50 + i % 2 * 10, 4, c);
    }
    g.globalAlpha = 1;
    const life = world.waterfront;
    if (!life) return;
    life.birds.forEach(function (b) {
      const flap = Math.sin(b.age * 3) > 0 ? -2 : 0;
      g.globalAlpha = 0.55 * (0.3 + world.daylight * 0.7);
      for (let i = 0; i < b.count; i++) {
        const x = b.x - i * 11 * b.dir, y = b.y + i % 2 * 4;
        px(g, x, y, 2, 2, '#3c414d');
        px(g, x - 3, y + flap, 3, 2, '#3c414d');
        px(g, x + 2, y + flap, 3, 2, '#3c414d');
      }
    });
    life.planes.forEach(function (p) {
      g.globalAlpha = 0.4;
      px(g, p.x, p.y, 10, 2, '#e8ecf5');
      px(g, p.x + 4, p.y - 3, 2, 7, '#e8ecf5');
      px(g, p.x + (p.dir > 0 ? 0 : 8), p.y - 2, 2, 4, '#e8ecf5');
      g.globalAlpha = 0.07;
      px(g, p.x - p.dir * 22, p.y, 18, 2, '#e8ecf5');
    });
    g.globalAlpha = 1;
  }

  function paintState(world) {
    const mem = world.memory, rec = mem && mem.arcs['street-house'];
    const def = window.CAST && CAST.arcs.find(function (a) { return a.id === 'street-house'; });
    const done = !!(mem && mem.flags['street-house-painted']);
    return { done: done, amount: done ? 1 : rec && def ? clamp(rec.progress / def.rows) : 0 };
  }

  function town(g, world) {
    const ps = paintState(world);
    // A modest distant copper spire, behind the apartment roofs.
    px(g, 548, 97, 8, 44, tone('#718b91', world));
    px(g, 550, 89, 4, 8, tone('#718b91', world));
    px(g, 551, 84, 2, 5, tone('#5a7a72', world));
    houses.forEach(function (h, i) {
      const x = h[0], y = h[1], width = h[2], bottom = F.bankY - 2;
      const c = tone(h[3], world), named = x === F.house.x;
      px(g, x, y, width, bottom - y, c);
      if (named) {
        const n = Math.round(F.house.h * ps.amount);
        px(g, x, y, width, n, tone(PAINT, world));
        if (n && n < F.house.h) px(g, x + 5, y + n, 11, 2, tone(PAINT, world));
        if (!ps.done && n < 22) px(g, x + 14, y + 24, 8, 2, tone('#60777e', world));
      }
      // Pitched tile roof, dormer, cornice, recessed doors and sash windows.
      for (let r = 0; r < 4; r++) px(g, x + 5 - r * 2, y - 8 + r * 2, width - 10 + r * 4, 2, tone('#744b40', world));
      px(g, x + 5, y - 12, 3, 7, tone('#6e4a33', world));
      px(g, x - 1, y, width + 2, 2, tone('#e3cfa7', world));
      px(g, x + width - 3, y + 2, 3, bottom - y - 2, 'rgba(36,31,34,0.15)');
      px(g, x + width / 2 - 2, y - 5, 5, 4, tone('#c9b28a', world));
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < Math.floor((width - 6) / 9); col++) {
          const wx = x + 4 + col * 10, wy = y + 5 + row * 10;
          if (wy + 6 >= bottom) continue;
          px(g, wx - 1, wy - 1, 6, 8, tone('#e3cfa7', world));
          px(g, wx, wy, 4, 6, tone('#3c535d', world));
          const lit = clamp((world.pal.lamp - h2(i + col, row) * 0.35) * 1.6);
          if (h2(i * 4 + col, row + 9) > 0.28 || (named && ps.done && col === 1 && row === 1)) {
            g.globalAlpha = lit;
            px(g, wx, wy, 4, 6, '#f5c66a');
            g.globalAlpha = 1;
          }
          px(g, wx, wy + 3, 4, 1, tone('#c9b28a', world));
        }
      }
      px(g, x + width / 2 - 2, bottom - 7, 5, 7, tone('#5a4a40', world));
    });
    px(g, F.x0, F.bankY - 2, F.x1 - F.x0, 4, tone('#c9b28a', world));
    px(g, F.x0, F.bankY + 2, F.x1 - F.x0, 5, tone('#7c7770', world));
    for (let x = F.x0; x < F.x1; x += 16) px(g, x, F.bankY + 3, 2, 3, tone('#60777e', world));
    // The worker and ladder now stand on the FAR quay, above the water.
    if (!ps.done) {
      const f = F.house, top = Math.min(f.y + 20, f.y + Math.round(ps.amount * 22));
      const lx = f.x + f.w - 5;
      px(g, lx - 3, top, 2, F.bankY - top, tone('#b8bfc7', world));
      px(g, lx + 3, top, 2, F.bankY - top, tone('#b8bfc7', world));
      for (let y = top + 4; y < F.bankY; y += 5) px(g, lx - 1, y, 4, 1, tone('#b8bfc7', world));
      if (world.daylight > 0.45 && world.rain < 0.3) {
        const y = Math.min(F.bankY - 3, top + 15), stroke = Math.floor(world.t * 1.2) % 3;
        px(g, lx - 2, y - 10, 5, 7, '#e8dfc9');
        px(g, lx - 1, y - 14, 4, 4, '#c9b28a');
        px(g, lx - 2, y - 15, 6, 2, '#e8dfc9');
        px(g, lx - 2, y - 3, 2, 4, '#3c414d'); px(g, lx + 2, y - 3, 2, 4, '#3c414d');
        px(g, lx - 6, y - 9 - stroke, 5, 2, '#e8dfc9');
        px(g, lx - 8, y - 11 - stroke, 2, 4, PAINT);
        px(g, lx + 7, F.bankY - 3, 4, 3, tone(PAINT, world));
      }
    }
  }

  function sailingShip(g, world, b, x, y) {
    // A broad timber hull, two gaff-rigged masts and a long bowsprit.
    // Draw in local integer pixels so the opposite passage mirrors exactly.
    g.save(); g.translate(x, y); g.scale(b.dir, 1);
    function r(x, y, w, h, c) { px(g, x, y, w, h, tone(c, world)); }
    g.globalAlpha = 0.22;
    r(-54, 8, 99, 2, '#dcefe8'); r(-62, 11, 76, 1, '#dcefe8');
    r(-31, 12, 62, 2, '#6e4a33');
    g.globalAlpha = 1;
    r(-43, -3, 84, 5, '#b88a62');
    r(-40, 2, 77, 4, '#7d5334'); r(-34, 6, 65, 3, '#5a3b2a');
    r(-42, -5, 83, 2, '#e3cfa7');
    r(-40, -10, 16, 5, '#6e4a33'); r(-41, -11, 18, 2, '#c9b28a');
    r(-37, -8, 3, 2, '#f5c66a'); r(-30, -8, 3, 2, '#f5c66a');
    for (let j = -32; j < 33; j += 10) r(j, 0, 6, 1, '#c9a04a');
    for (let j = 0; j < 7; j++) r(34 + j * 3, -5 - j, 5, 2, '#6e4a33');
    [-19, 13].forEach(function (mast, i) {
      const top = i ? -60 : -51;
      r(mast, top, 2, -top - 4, '#6e4a33');
      // Stepped cloth edges and warm shadow along the leech.
      for (let row = 0; row < 16; row++) {
        const width = 17 + Math.round(Math.sin(row / 15 * Math.PI) * 5);
        r(mast - width, top + 8 + row * 2, width, 2, '#e8dfc9');
        r(mast - width, top + 8 + row * 2, 2, 2, '#c9b28a');
      }
      r(mast - 20, top + 6, 22, 2, '#b88a62');
      r(mast - 20, top + 40, 22, 2, '#b88a62');
      // Fine rigging, stepped rather than antialiased strokes.
      for (let row = 0; row < -top - 6; row += 3) {
        r(mast + 3 + Math.round(row * 0.38), top + 4 + row, 1, 3, '#8b7158');
      }
    });
    for (let row = 0; row < 20; row++) r(17, -52 + row * 2, 2 + row, 2, '#e8dfc9');
    const flutter = Math.round(Math.sin(b.age * 1.5));
    r(15, -60, 10, 3, '#b5654a'); r(21, -59 + flutter, 6, 3, '#b5654a');
    [-9, 5, 26].forEach(function (crew, i) {
      r(crew, -10, 3, 5, i === 1 ? '#8a3d3d' : '#60777e');
      r(crew, -13, 3, 3, '#c9b28a');
      if (i === 2) r(crew + 3, -12 + Math.round(Math.sin(b.age * 2)), 2, 5, '#c9b28a');
    });
    g.restore();
  }

  function water(g, world) {
    px(g, F.x0, F.waterY, F.x1 - F.x0, F.nearY - F.waterY, tone('#79a5ad', world));
    houses.forEach(function (h, i) {
      g.globalAlpha = 0.17;
      for (let y = F.waterY; y < F.nearY - 2; y += 4) {
        const drift = Math.round(Math.sin(world.t * 0.55 + i + y) * 3);
        px(g, h[0] + drift + 4, y, h[2] - 8, 2, tone(h[3], world));
      }
      g.globalAlpha = world.pal.lamp * 0.3;
      px(g, h[0] + 10, F.waterY + 2, 4, 3, '#f5c66a');
      px(g, h[0] + 8 + Math.sin(world.t * 0.5 + i) * 2, F.waterY + 8, 8, 2, '#f5c66a');
    });
    const sun = S.sunPosition(world.hour);
    if (sun.visible) {
      g.globalAlpha = world.daylight * (1 - world.rain) * 0.24;
      for (let y = F.waterY + 4; y < F.nearY; y += 5) {
        const width = 6 + (y - F.waterY) * 0.5;
        px(g, sun.x - width / 2 + Math.sin(world.t * 0.7 + y) * 2, y, width, 2, '#f8dc8a');
      }
    }
    g.globalAlpha = 0.24;
    for (let i = 0; i < 38; i++) {
      const x = F.x0 + ((i * 47 + world.t * 1.4) % (F.x1 - F.x0));
      px(g, x, F.waterY + 4 + i % 4 * 5, 4 + i % 4 * 3, 1, '#dcefe8');
    }
    g.globalAlpha = 1;
    (world.waterfront ? world.waterfront.boats : []).forEach(function (b) {
      const x = Math.round(b.x), y = Math.round(b.y + Math.sin(b.age * 0.8) * 0.7);
      if (b.ship) { sailingShip(g, world, b, x, y); return; }
      g.globalAlpha = 0.3;
      px(g, x - 15 - b.dir * 9, y + 4, 25, 2, '#dcefe8');
      g.globalAlpha = 1;
      px(g, x - 12, y, 24, 3, tone(b.sail ? '#e8dfc9' : '#6e4a33', world));
      px(g, x - 9, y + 3, 18, 2, tone('#5a4a40', world));
      if (b.sail) {
        px(g, x, y - 18, 2, 18, tone('#6e4a33', world));
        for (let j = 0; j < 7; j++) px(g, x + 2, y - 16 + j * 2, 2 + j, 2, tone('#e8dfc9', world));
      } else {
        px(g, x - 4, y - 6, 5, 6, tone('#8a3d3d', world));
        px(g, x - 3, y - 10, 4, 4, tone('#c9b28a', world));
        const stroke = Math.sin(b.age * 1.2);
        px(g, x - 3, y - 1, 15, 2, tone('#b88a62', world));
        px(g, x + 10, y + 1 + stroke * 2, 5, 2, tone('#b88a62', world));
      }
    });
  }

  let sprite;
  function person(g, p, x, y) {
    if (!sprite) { sprite = document.createElement('canvas'); sprite.width = 72; sprite.height = 88; }
    const ctx = sprite.getContext('2d'); ctx.clearRect(0, 0, 72, 88);
    S.drawPerson(ctx, Object.assign({}, p, { x: 36, y: 76, heading: '', bubble: null,
      state: p.state === 'terraceClear' ? 'wipe' : p.state }));
    g.imageSmoothingEnabled = false;
    g.drawImage(sprite, Math.round(x) - 18, Math.round(y) - 38, 36, 44);
  }
  function chair(g, x, y, dir, world) {
    const c = tone('#60777e', world);
    px(g, x - dir * 5, y - 17, 2, 17, c);
    px(g, x - 6, y - 9, 12, 3, tone('#b88a62', world));
    px(g, x + dir * 4, y - 7, 2, 7, c);
    px(g, x - dir * 5, y - 17, 7 * dir, 2, c);
  }
  S.drawTerrace = function (g, world) {
    const wf = world.waterfront;
    if (!wf) return;
    F.tables.forEach(function (a, i) {
      const tb = wf.tables[i], base = F.terraceY;
      ell(g, a.x, base, 24, 3, 'rgba(36,31,34,0.15)');
      chair(g, a.x - 16, base, 1, world); chair(g, a.x + 18, base, -1, world);
      const p = world.patrons.find(function (p) { return p.outside && p.state === 'terraceSit' && p.terraceTable === i; });
      if (p) person(g, p, p.exteriorX, base);
      px(g, a.x - 1, a.y + 2, 3, base - a.y - 2, tone('#3c414d', world));
      px(g, a.x - 7, base - 1, 15, 2, tone('#3c414d', world));
      ell(g, a.x, a.y + 2, 13, 3, tone('#7d5334', world));
      ell(g, a.x, a.y, 14, 3, tone('#c9b28a', world));
      if (tb.cup && !(p && p.armUp > 0.1)) {
        px(g, a.x - 7, a.y - 1, 8, 2, '#d9d2c0');
        px(g, a.x - 6, a.y - 5, 5, 4, '#e8e0d0');
        px(g, a.x - 1, a.y - 4, 2, 2, '#d9d2c0');
      }
    });
    world.patrons.forEach(function (p) {
      if (p.outside && p.state !== 'terraceSit') person(g, p, p.exteriorX, F.terraceY);
    });
    const b = world.barista;
    if (b.outside) person(g, b, b.exteriorX, F.terraceY);
  };

  S.drawWaterfront = function (g, world) {
    sky(g, world); town(g, world); water(g, world);
    px(g, F.x0, F.nearY, F.x1 - F.x0, 3, tone('#e3cfa7', world));
    px(g, F.x0, F.nearY + 3, F.x1 - F.x0, 30, tone('#a99b85', world));
    for (let row = 0; row < 5; row++) {
      const y = F.nearY + 5 + row * 6;
      px(g, F.x0, y, F.x1 - F.x0, 1, 'rgba(61,57,52,0.1)');
      for (let x = F.x0 + row % 2 * 10; x < F.x1; x += 24) px(g, x, y, 1, 5, 'rgba(61,57,52,0.12)');
    }
    // Low waterside railing; figures walk in front, cups sit nearer the glass.
    px(g, F.x0, F.nearY - 6, F.x1 - F.x0, 2, tone('#60777e', world));
    for (let x = F.x0 + 9; x < F.x1; x += 38) px(g, x, F.nearY - 7, 2, 11, tone('#60777e', world));
    F.lamps.forEach(function (p) {
      px(g, p.x, p.y - 27, 2, 29, tone('#3c414d', world));
      px(g, p.x - 4, p.y - 28, 10, 2, tone('#3c414d', world));
      px(g, p.x - 2, p.y - 26, 6, 7, tone('#c9b28a', world));
      g.globalAlpha = world.pal.lamp;
      px(g, p.x - 2, p.y - 26, 6, 6, '#f8dc8a');
      g.globalAlpha = world.pal.lamp * 0.1;
      ell(g, p.x + 1, p.y - 23, 11, 13, '#f5c66a');
      ell(g, p.x + 1, p.y + 5, 17, 4, '#f5c66a');
      g.globalAlpha = 1;
    });
  };
})();
