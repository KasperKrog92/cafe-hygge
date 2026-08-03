/* Café Hygge — people, cat, bubbles, and icon rendering */
(function () {
  'use strict';

  const SCENE = window.SCENE;
  const R = SCENE._;
  const px = R.px, ell = R.ell, shade = R.shade;

  /* ================= PEOPLE ================= */

  /* A standing character is 60 px tall (the café ruler CH): legs 16,
     torso 24, head 16 + hair. Seated reads slightly hunched at ~52.
     Detail pass: brows + 3×4 eyes, actual hands, four hair styles
     (0 classic / 1 side-part / 2 curly / 3 bun), clothing folds, scarf
     knots, apron strings, a 4-frame walk and a subtle idle breathe. */
  function drawHead(g, x, hy, facing, c) {
    const hairL = shade(c.hair, 0.18);
    const st = c.hairStyle || 0;
    const bx = facing > 0 ? x - 8 : x + 6;                 // back of the head
    // face
    px(g, x - 8, hy, 18, 16, c.skin);
    // hair cap + shine
    px(g, x - 8, hy - 4, 18, 6, c.hair);
    px(g, x + (facing > 0 ? -5 : -1), hy - 3, 7, 2, hairL);
    px(g, bx, hy, 5, 8, c.hair);
    if (st === 1) {                                        // swept side-part fringe
      px(g, facing > 0 ? x - 2 : x - 6, hy + 2, 8, 2, c.hair);
      px(g, facing > 0 ? x + 4 : x - 6, hy + 4, 2, 2, c.hair);
    } else if (st === 2) {                                 // curly: bumps over the cap
      px(g, x - 7, hy - 6, 5, 2, c.hair);
      px(g, x - 1, hy - 7, 6, 3, c.hair);
      px(g, x + 5, hy - 6, 5, 2, c.hair);
      px(g, bx + (facing > 0 ? -1 : 2), hy + 7, 3, 4, c.hair);
    } else if (st === 3) {                                 // hair tied up in a bun
      px(g, bx + (facing > 0 ? -4 : 3), hy - 7, 7, 7, c.hair);
      px(g, bx + (facing > 0 ? -3 : 4), hy - 6, 3, 2, hairL);
    }
    if (c.longHair && st !== 3) {
      px(g, facing > 0 ? x - 11 : x + 8, hy + 2, 5, 18, c.hair);
    }
    // brow + eye
    const ex = facing > 0 ? x + 5 : x - 8;
    px(g, ex, hy + 3, 4, 2, c.hair);
    px(g, ex, hy + 6, 3, 4, '#2a1a12');
    if (c.beard) {
      px(g, facing > 0 ? x - 1 : x - 8, hy + 12, 9, 4, c.hair);
      px(g, facing > 0 ? x + 3 : x - 4, hy + 13, 3, 2, shade(c.hair, -0.25));
    } else {
      px(g, facing > 0 ? x + 5 : x - 6, hy + 12, 3, 2, shade(c.skin, -0.22));   // mouth
      px(g, facing > 0 ? x - 1 : x - 2, hy + 10, 4, 2, 'rgba(214,106,90,0.3)'); // blush
    }
  }

  SCENE.drawPerson = function (g, p) {
    const facing = p.facing >= 0 ? 1 : -1;
    const walk = p.pose === 'walk';
    const cycle = walk ? (Math.floor(p.animT * 8) % 4) : 0;
    const pass = cycle === 1 || cycle === 3;               // passing frames bob up
    const y = p.y - (walk && pass ? 2 : 0);
    const x = Math.round(p.x);
    const c = p.colors;
    const breathe = !walk && Math.sin(p.animT * 1.6) > 0.3 ? 1 : 0;
    const topD = shade(c.top, -0.18);

    ell(g, x, p.y + 2, 14, 5, 'rgba(20,12,8,0.25)');

    if (p.pose === 'sit') {
      // bent legs with a knee crease
      px(g, x - 8, y - 10, 16, 10, c.pants);
      px(g, x + facing * 5 - (facing > 0 ? 0 : 5), y - 10, 7, 10, c.pants);
      px(g, x + facing * 3 - (facing > 0 ? 0 : 4), y - 10, 2, 6, shade(c.pants, -0.2));
      px(g, x - 8, y - 3, 18, 3, '#3a2a1c');
      // torso, slightly hunched
      px(g, x - 10, y - 32, 20, 22, c.top);
      px(g, x - 1, y - 28, 2, 12, topD);                        // fold
      px(g, x - 10, y - 12, 20, 2, topD);                       // hem
      if (c.scarf) {
        px(g, x - 10, y - 32, 20, 5, c.scarf);
        const kx = facing > 0 ? x + 5 : x - 9;
        px(g, kx, y - 29, 4, 4, shade(c.scarf, -0.15));         // knot
        px(g, kx, y - 25, 4, 7, c.scarf);                       // tail
        px(g, kx, y - 19, 2, 2, shade(c.scarf, -0.15));         // fringe
      }
      // gazeFacing (window sitters looking out) turns the head only —
      // the body keeps leaning on its cushion
      drawHead(g, x, y - 48 + breathe, p.gazeFacing || facing, c);
      // arms + what they hold
      if (p.reading) {
        px(g, x + facing * 3 - 2, y - 24, 5, 8, c.top);
        const bx = x + facing * 10 - 9;
        px(g, bx, y - 29, 18, 10, '#f5efdf');
        px(g, bx + 8, y - 29, 2, 10, '#b5a888');
        px(g, bx, y - 31, 18, 2, '#c9b28a');
        px(g, bx - 2, y - 26, 3, 4, c.skin);                    // hands on the covers
        px(g, bx + 17, y - 26, 3, 4, c.skin);
      } else if (p.holding === 'cup') {
        const up = p.armUp || 0;
        const hy = y - 26 - up * 17;
        const hx = x + facing * (13 - up * 5);
        px(g, x + facing * 5, y - 30, 5, Math.round(10 - up * 3), c.top);
        px(g, hx - 3, hy, 10, 10, '#e8e0d0');
        px(g, hx + (facing > 0 ? 7 : -6), hy + 3, 3, 4, '#e8e0d0');
        px(g, hx + (facing > 0 ? -5 : 6), hy + 4, 3, 4, c.skin);  // hand on the cup
      } else {
        px(g, x + facing * 8 - (facing > 0 ? 0 : 3), y - 30, 5, 12, c.top);
        px(g, x + facing * 8 - (facing > 0 ? 0 : 2), y - 20, 4, 3, c.skin); // resting hand
      }
      return;
    }

    // standing / walking legs (4-frame walk: stride, pass, stride, pass)
    if (walk) {
      if (pass) {
        px(g, x - 8, y - 16, 8, 16, c.pants);
        px(g, x + 1, y - 16, 7, 16, c.pants);
        px(g, x - 8, y - 3, 8, 3, '#3a2a1c');
        px(g, x + 1, y - 3, 7, 3, '#3a2a1c');
      } else {
        const s = cycle === 0 ? 1 : -1;
        px(g, x - 10 + s * 3, y - 16, 8, 16, c.pants);
        px(g, x + 2 - s * 3, y - 16, 8, 16, c.pants);
        px(g, x - 10 + s * 3, y - 3, 8, 3, '#3a2a1c');
        px(g, x + 2 - s * 3, y - 3, 8, 3, '#3a2a1c');
      }
    } else {
      px(g, x - 10, y - 16, 8, 16, c.pants);
      px(g, x + 2, y - 16, 8, 16, c.pants);
      px(g, x - 8, y - 12, 2, 8, shade(c.pants, -0.2));    // creases
      px(g, x + 4, y - 12, 2, 8, shade(c.pants, -0.2));
      px(g, x - 10, y - 3, 18, 3, '#3a2a1c');
    }
    // torso with shoulder light, centre fold and hem
    px(g, x - 10, y - 40, 20, 24, c.top);
    px(g, x - 10, y - 40, 20, 2, shade(c.top, 0.12));
    px(g, x - 1, y - 34, 2, 14, topD);
    px(g, x - 10, y - 18, 20, 2, topD);
    if (c.scarf) {
      px(g, x - 10, y - 40, 20, 5, c.scarf);
      const kx = facing > 0 ? x + 5 : x - 9;
      px(g, kx, y - 37, 4, 4, shade(c.scarf, -0.15));      // knot
      px(g, kx, y - 33, 4, 8, c.scarf);                    // hanging tail
      px(g, kx, y - 26, 2, 2, shade(c.scarf, -0.15));      // fringe
    }
    if (c.apron) {
      px(g, x - 8, y - 32, 16, 16, '#e8dfc9');
      px(g, x - 3, y - 37, 6, 5, '#e8dfc9');
      px(g, x - 5, y - 39, 2, 3, '#c9b28a');               // neck straps
      px(g, x + 3, y - 39, 2, 3, '#c9b28a');
      px(g, x - 8, y - 32, 16, 2, '#c9b28a');              // waistband
      px(g, x - 5, y - 26, 10, 7, '#d9d2c0');              // pocket
      px(g, x - 5, y - 26, 10, 2, '#c9b28a');
      const abx = facing > 0 ? x - 13 : x + 10;            // tie bow at the back
      px(g, abx, y - 31, 4, 3, '#e8dfc9');
      px(g, abx + 1, y - 28, 2, 6, '#e8dfc9');
    }
    drawHead(g, x, y - 56 + breathe, facing, c);
    // arm + held item, with actual hands
    const held = p.holding;
    const swing = walk && !pass ? (cycle === 0 ? 2 : -2) * facing : 0;
    if (held === 'cup' || held === 'plate' || held === 'cloth') {
      px(g, x + facing * 8 - (facing > 0 ? 0 : 3), y - 34, 5, 10, c.top);
      const hx = x + facing * 13 - (facing > 0 ? 0 : 8);
      if (held === 'cup') {
        px(g, hx, y - 32, 10, 10, '#e8e0d0');
        px(g, hx + (facing > 0 ? 10 : -3), y - 29, 3, 5, '#e8e0d0');
        px(g, hx + (facing > 0 ? -3 : 9), y - 28, 4, 4, c.skin);
      } else if (held === 'plate') {
        px(g, hx - 3, y - 26, 15, 5, '#e8e0d0');
        px(g, hx, y - 31, 10, 5, '#c98f4a');
        px(g, hx + 3, y - 21, 5, 3, c.skin);               // palm under the plate
      } else {
        px(g, hx, y - 26, 10, 7, '#7a89a5');
        px(g, hx + 2, y - 29, 4, 3, c.skin);               // hand on the cloth
      }
    } else if (held === 'book') {
      // borrowed book tucked under the arm
      px(g, x + facing * 8 - (facing > 0 ? 0 : 3), y - 34, 5, 12, c.top);
      const bkx = x + facing * 12 - (facing > 0 ? 0 : 10);
      px(g, bkx, y - 25, 10, 8, '#a94f3f');
      px(g, bkx, y - 25, 10, 2, shade('#a94f3f', -0.2));
      px(g, bkx + (facing > 0 ? 8 : 0), y - 24, 2, 6, '#f5efdf');   // page edges
      px(g, x + facing * 8 - (facing > 0 ? 0 : 2), y - 22, 4, 4, c.skin);
    } else {
      px(g, x + facing * 8 - (facing > 0 ? 0 : 3) + swing, y - 34, 5, 16, c.top);
      px(g, x + facing * 8 - (facing > 0 ? 0 : 2) + swing, y - 20, 4, 4, c.skin);
    }
  };

  /* ---------- the cat ---------- */
  SCENE.drawCat = function (g, cat) {
    const x = Math.round(cat.x), y = Math.round(cat.y);
    const t = cat.animT;
    const pose = cat.state === 'hop' ? 'stretch' : cat.state;
    const look = cat.gazeFacing || cat.facing;
    const f = look >= 0 ? 1 : -1;
    const body = '#d98d4a', dark = '#b5702e', cream = '#f0e0c8', pink = '#d9738a';
    const twitch = Math.sin(t * 0.9) > 0.97;    // an occasional ear flick
    ell(g, x, y + 2, 14, 4, 'rgba(20,12,8,0.2)');

    // ears that move: base + tip triangles, pink inner on the facing side
    function ears(hx, hw, hy) {
      const e1 = hx + 1, e2 = hx + hw - 5;
      px(g, e1, hy - 2, 4, 3, body);
      px(g, e1 + 1, hy - (twitch ? 3 : 4), 2, 2, dark);
      px(g, e2, hy - 2, 4, 3, body);
      px(g, e2 + 1, hy - 4, 2, 2, dark);
      px(g, (f > 0 ? e2 : e1) + 1, hy - 1, 2, 2, pink);
    }

    if (pose === 'sleep' || pose === 'lap') {
      const breathe = Math.sin(t * 1.7) > 0 ? 2 : 0;
      px(g, x - 12, y - 9 - breathe, 24, 9 + breathe, body);
      px(g, x - 12, y - 4, 24, 4, dark);
      px(g, x - 7, y - 9 - breathe, 2, 5, dark); px(g, x, y - 9 - breathe, 2, 5, dark);
      px(g, x + 3, y - 14, 10, 7, body);
      ears(x + 3, 10, y - 14);
      px(g, x + 5, y - 11, 5, 2, '#8a6142');            // closed eye
      // tail curled right around the front, pale tip
      px(g, x - 15, y - 8, 4, 8, dark);
      px(g, x - 12, y - 3, 9, 3, dark);
      px(g, x - 4, y - 4, 3, 3, cream);
    } else if (pose === 'perch') {
      // Back view for the middle window sill: ears and shoulders against the
      // glass, with the pale tail tip making the smallest movement.
      const headShift = cat.gazeFacing ? f * 2 : 0;
      px(g, x - 8, y - 18, 16, 18, body);
      px(g, x - 6 + headShift, y - 24, 12, 9, body);
      px(g, x - 6 + headShift, y - 27, 4, 4, dark); px(g, x + 2 + headShift, y - 27, 4, 4, dark);
      px(g, x - 4, y - 16, 2, 8, dark); px(g, x + 2, y - 15, 2, 7, dark);
      const backSway = Math.round(Math.sin(t * 1.8) * 2);
      px(g, x - 14, y - 5, 11, 3, dark);
      px(g, x - 16 + backSway, y - 8, 4, 5, dark);
      px(g, x - 16 + backSway, y - 10, 4, 2, cream);
    } else if (pose === 'eat' || pose === 'drink') {
      px(g, x - 12, y - 11, 22, 9, body);
      px(g, x - 8, y - 4, 4, 4, dark); px(g, x + 5, y - 4, 4, 4, body);
      const dip = Math.round(Math.sin(t * (pose === 'drink' ? 12 : 7)) > 0 ? 1 : 0);
      px(g, x - 16, y - 9 + dip, 11, 8, body);
      ears(x - 16, 11, y - 9 + dip);
      if (pose === 'drink') px(g, x - 17, y - 1, 4, 1, pink);
      px(g, x + 10, y - 15, 4, 8, dark); px(g, x + 12, y - 19, 3, 5, dark);
      px(g, x + 12, y - 21, 3, 2, cream);
    } else if (pose === 'sit' || pose === 'groom') {
      px(g, x - 7, y - 17, 14, 17, body);
      px(g, x - 5, y - 5, 10, 5, cream);
      px(g, x - 7, y - 14, 2, 3, dark); px(g, x + 4, y - 15, 2, 3, dark);   // stripes
      const hy = pose === 'groom' ? y - 19 : y - 26;
      const hx = pose === 'groom' ? x + f * 2 : x;
      px(g, hx - 5, hy, 14, 9, body);
      ears(hx - 5, 14, hy);
      if (pose === 'sit') {
        px(g, hx + (f > 0 ? 4 : -5), hy + 3, 2, 2, '#3a5a2a');              // eye
        px(g, hx + (f > 0 ? 6 : -8), hy + 5, 3, 3, cream);                  // muzzle
        px(g, hx + (f > 0 ? 7 : -7), hy + 5, 2, 2, pink);                   // nose
      } else {
        px(g, hx + f * 4 - (f > 0 ? 0 : 3), hy + 7, 3, 4, body);            // raised grooming paw
      }
      // tail wrapped around the paws, tip curling and swaying
      const sway = Math.round(Math.sin(t * 2.2) * 2);
      px(g, x - f * 9 - 2, y - 7, 4, 7, dark);
      px(g, f > 0 ? x - 8 : x - 4, y - 3, 12, 3, dark);
      px(g, (f > 0 ? x + 2 : x - 8) + sway, y - 6, 3, 4, dark);
      px(g, (f > 0 ? x + 2 : x - 8) + sway, y - 7, 3, 2, cream);
    } else if (pose === 'knead') {
      const paw = Math.floor(t * 6) % 2;
      px(g, x - 12, y - 12, 24, 10, body);
      px(g, x + 5, y - 19, 10, 9, body); ears(x + 5, 10, y - 19);
      px(g, x - 8 - paw * 2, y - 3, 7, 4, cream);
      px(g, x + 1 + paw * 2, y - 3, 7, 4, cream);
      px(g, x - 15, y - 8, 5, 6, dark); px(g, x - 16, y - 10, 4, 3, cream);
    } else if (pose === 'stretch') {
      px(g, x - 12, y - 7, 12, 7, body);
      px(g, x, y - 12, 12, 12, body);
      px(g, x + 8, y - 19, 10, 9, body);
      ears(x + 8, 10, y - 19);
      // tail curved up in two segments
      px(g, x - 15, y - 14, 4, 6, dark);
      px(g, x - 17, y - 19, 3, 5, dark);
      px(g, x - 17, y - 21, 3, 2, cream);
    } else { // walk / loaf / pounce
      const moving = pose === 'walk' || pose === 'pounce';
      const step = moving ? (Math.floor(t * (pose === 'pounce' ? 12 : 8)) % 2) : 0;
      px(g, x - 12, y - 12, 24, 9, body);
      px(g, x - 8, y - 12, 2, 4, dark); px(g, x - 2, y - 12, 2, 5, dark); px(g, x + 4, y - 12, 2, 4, dark);
      px(g, x - 10, y - 5, 7, 2, dark); px(g, x + 5, y - 5, 7, 2, dark);
      if (moving) {
        px(g, x - 10 + step * 2, y - 3, 3, 4, body); px(g, x + 7 - step * 2, y - 3, 3, 4, body);
        px(g, x - 3 - step * 2, y - 3, 3, 4, dark); px(g, x + 2 + step * 2, y - 3, 3, 4, dark);
      }
      const hx = x + f * 10 - (f > 0 ? 0 : 8);
      px(g, hx, y - 19, 10, 9, body);
      ears(hx, 10, y - 19);
      px(g, hx + (f > 0 ? 6 : 1), y - 16, 2, 2, '#3a5a2a');                 // eye
      if (pose === 'pounce') {
        px(g, x + f * 10 - (f > 0 ? 0 : 6), y - 9, 7, 3, body);             // batting paw
        px(g, x + f * 15 - (f > 0 ? 0 : 3), y - 9, 3, 3, cream);
      }
      // curved tail: base rises from the rump, tip sways the most
      const ts = Math.round(Math.sin(t * 5) * 2);
      px(g, f > 0 ? x - 15 : x + 11, y - 16, 4, 7, dark);
      px(g, f > 0 ? x - 17 : x + 14, y - 20 + ts, 3, 5, dark);
      px(g, f > 0 ? x - 17 : x + 14, y - 22 + ts, 3, 2, cream);
    }

    if (cat.surface === 'backShelf' && pose !== 'stretch') {
      const drape = Math.round(Math.sin(t * 1.6) * 2);
      px(g, x + 9, y - 3, 4, 17, dark);
      px(g, x + 9 + drape, y + 12, 4, 7, dark);
      px(g, x + 9 + drape, y + 18, 4, 3, cream);
    }
  };

  /* ---------- speech bubbles ---------- */
  SCENE.drawBubble = function (g, x, y, icon) {
    const bx = Math.round(x) - 22, by = Math.round(y) - 100;
    g.fillStyle = '#c9b28a';
    g.fillRect(bx - 2, by - 2, 48, 38);
    g.fillStyle = '#fdf8ec';
    g.fillRect(bx, by, 44, 34);
    px(g, bx + 18, by + 34, 6, 4, '#fdf8ec');
    px(g, bx + 20, by + 38, 2, 2, '#fdf8ec');
    drawIcon(g, bx + 14, by + 10, icon);
  };

  function drawIcon(g, x, y, icon) {
    switch (icon) {
      case 'coffee':
        px(g, x, y + 4, 12, 10, '#a94f3f');
        px(g, x + 12, y + 6, 4, 4, '#a94f3f');
        px(g, x + 2, y + 4, 8, 2, '#6b4429');
        px(g, x + 2, y, 2, 2, '#b5aa92'); px(g, x + 6, y - 2, 2, 2, '#b5aa92');
        break;
      case 'tea':
        px(g, x, y + 6, 14, 6, '#4a7a5a');
        px(g, x + 14, y + 6, 2, 4, '#4a7a5a');
        px(g, x + 2, y + 6, 10, 2, '#8a9a4a');
        px(g, x + 4, y, 2, 4, '#5a8a52'); px(g, x + 8, y - 2, 2, 4, '#5a8a52');
        break;
      case 'cocoa':
        px(g, x, y + 2, 12, 12, '#8a5a3a');
        px(g, x + 12, y + 4, 4, 4, '#8a5a3a');
        px(g, x + 2, y + 2, 8, 2, '#f0e0c8');
        break;
      case 'bun':
        ell(g, x + 6, y + 8, 8, 6, '#c98f4a');
        px(g, x + 2, y + 4, 8, 2, '#e0b06a');
        px(g, x + 4, y + 8, 2, 2, '#8a5a2a'); px(g, x + 8, y + 6, 2, 2, '#8a5a2a');
        break;
      case 'croissant':
        px(g, x, y + 6, 4, 6, '#d9a05a');
        px(g, x + 4, y + 4, 8, 8, '#e0b06a');
        px(g, x + 12, y + 6, 4, 6, '#d9a05a');
        px(g, x + 6, y + 2, 4, 2, '#d9a05a');
        break;
      case 'dots':
        px(g, x, y + 6, 4, 4, '#8a7a63');
        px(g, x + 6, y + 6, 4, 4, '#8a7a63');
        px(g, x + 12, y + 6, 4, 4, '#8a7a63');
        break;
      case 'heart':
        px(g, x + 2, y + 2, 4, 4, '#d96a6a'); px(g, x + 10, y + 2, 4, 4, '#d96a6a');
        px(g, x, y + 4, 16, 4, '#d96a6a');
        px(g, x + 2, y + 8, 12, 2, '#d96a6a');
        px(g, x + 4, y + 10, 8, 2, '#d96a6a');
        px(g, x + 6, y + 12, 4, 2, '#d96a6a');
        break;
      case 'zzz':
        px(g, x, y, 6, 2, '#8a9ab5'); px(g, x + 2, y + 2, 2, 2, '#8a9ab5'); px(g, x, y + 4, 6, 2, '#8a9ab5');
        px(g, x + 8, y + 6, 6, 2, '#8a9ab5'); px(g, x + 10, y + 8, 2, 2, '#8a9ab5'); px(g, x + 8, y + 10, 6, 2, '#8a9ab5');
        break;
      case 'note':
        px(g, x + 8, y, 2, 10, '#7a6ab5');
        px(g, x + 10, y, 4, 2, '#7a6ab5'); px(g, x + 12, y + 2, 2, 2, '#7a6ab5');
        px(g, x + 4, y + 8, 4, 4, '#7a6ab5');
        break;
    }
  }

})();
