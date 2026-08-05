/* Café Hygge — boot, loop, viewport manager, and the little control bar */
(function () {
  'use strict';

  /* ---------- canvases ----------
     Everything renders into an offscreen 960×600 master canvas; the visible
     canvas shows either the full 16:10 master or its 960×540 16:9 crop,
     scaled by a whole number of *device* pixels (never fractional) so art
     pixels stay uniform. */

  const master = document.createElement('canvas');
  master.width = SCENE.W;
  master.height = SCENE.H;
  const g = master.getContext('2d');
  g.imageSmoothingEnabled = false;

  const canvas = document.getElementById('cafe');
  const out = canvas.getContext('2d');
  const stage = document.getElementById('stage');

  const world = SIM.create();
  window.__world = world; // handy for tinkering in the console

  /* ---------- viewport manager ----------
     Cover-fit: the master has croppable overscan (visible height 540–600,
     visible width 936–960), so any window aspect between ~1.56 and 16:9 is
     filled edge-to-edge with zero letterbox. Exact integer device-pixel
     scales (e.g. fullscreen 1920×1080 / 1920×1200 → ×2) present through the
     crisp pixelated path; fractional scales use "sharp bilinear": nearest-
     neighbour upscale to the next integer on the backing canvas, then a
     smooth CSS downscale to the exact window size — full-bleed without
     uneven-pixel shimmer. Aspects outside the overscan budget (ultrawide,
     portrait) get the minimal letterbox on one axis only. */

  const view = { x: 0, y: SCENE.VIEW_Y, w: SCENE.VIEW_W, h: SCENE.VIEW_H };

  function fit() {
    const dpr = window.devicePixelRatio || 1;
    const vw = Math.round(stage.clientWidth * dpr);   // viewport in device px
    const vh = Math.round(stage.clientHeight * dpr);
    if (!vw || !vh) return;
    const A = vw / vh;

    // choose the crop window inside the overscan budgets
    let mw = SCENE.W;
    let mh = Math.max(SCENE.VIEW_H, Math.min(SCENE.H, Math.round(SCENE.W / A)));
    if (mw / mh > A) mw = Math.max(SCENE.VIEW_MIN_W, Math.min(SCENE.W, Math.round(mh * A)));
    view.w = mw;
    view.h = mh;
    view.x = (SCENE.W - mw) >> 1;
    // distribute vertical crop like the designed 16:9 crop (36 top / 24 bottom)
    view.y = Math.round((SCENE.H - mh) * (SCENE.VIEW_Y / (SCENE.H - SCENE.VIEW_H)));

    const scale = Math.min(vw / mw, vh / mh);
    const sInt = Math.round(scale);
    const integer = sInt >= 1 && Math.abs(scale - sInt) < 0.002;
    const k = integer ? sInt : Math.max(1, Math.ceil(scale));

    canvas.width = mw * k;
    canvas.height = mh * k;
    const s = integer ? sInt : scale;
    canvas.style.width = (mw * s / dpr) + 'px';
    canvas.style.height = (mh * s / dpr) + 'px';
    canvas.style.imageRendering = integer ? 'pixelated' : 'auto';
    out.imageSmoothingEnabled = false;
  }

  window.addEventListener('resize', fit);
  document.addEventListener('fullscreenchange', fit);
  (function watchDPR() { // display move / zoom changes devicePixelRatio
    matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)')
      .addEventListener('change', function () { fit(); watchDPR(); }, { once: true });
  })();
  fit();

  /* ---------- UI ---------- */

  const overlay = document.getElementById('overlay');
  const controls = document.getElementById('controls');
  const btnMute = document.getElementById('btn-mute');
  const btnRain = document.getElementById('btn-rain');
  const btnFire = document.getElementById('btn-fire');
  const btnMusic = document.getElementById('btn-music');
  const btnFull = document.getElementById('btn-full');
  const vol = document.getElementById('vol');

  function refreshButtons() {
    const S = SND.settings;
    btnMute.textContent = S.muted ? '🔇' : '🔊';
    btnMute.classList.toggle('off', S.muted);
    btnRain.classList.toggle('off', !S.rain);
    btnFire.classList.toggle('off', !S.fire);
    btnMusic.classList.toggle('off', !S.music);
    vol.value = Math.round(S.volume * 100);
  }

  document.getElementById('enter').addEventListener('click', function () {
    SND.init();
    overlay.classList.add('gone');
    controls.classList.remove('hidden');
    refreshButtons();
    pokeControls();
  });

  btnMute.addEventListener('click', function () {
    SND.settings.muted = !SND.settings.muted;
    SND.applyVolume(); SND.save(); refreshButtons();
  });
  btnRain.addEventListener('click', function () {
    SND.settings.rain = !SND.settings.rain;
    SND.save(); refreshButtons();
  });
  btnFire.addEventListener('click', function () {
    SND.settings.fire = !SND.settings.fire;
    SND.applyToggles(); SND.save(); refreshButtons();
  });
  btnMusic.addEventListener('click', function () {
    SND.settings.music = !SND.settings.music;
    SND.applyToggles(); SND.save(); refreshButtons();
  });
  btnFull.addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else stage.requestFullscreen();
  });
  vol.addEventListener('input', function () {
    SND.settings.volume = vol.value / 100;
    SND.applyVolume(); SND.save();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'm') btnMute.click();
    if (e.key === 'f') btnFull.click();
  });

  // controls fade away when the mouse rests
  let fadeTimer = null;
  function pokeControls() {
    controls.classList.remove('faded');
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(function () { controls.classList.add('faded'); }, 3200);
  }
  document.addEventListener('mousemove', pokeControls);

  // a click (client coords → master-canvas coords): a waiting story invitation
  // takes it first, otherwise say hello to the cat. Both are optional and soft.
  canvas.addEventListener('click', function (e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * view.w + view.x;
    const y = (e.clientY - r.top) / r.height * view.h + view.y;
    if (SIM.beatAt(world, x, y)) return;
    const cat = world.cat;
    if (Math.hypot(x - cat.x, y - (cat.y - 10)) < 36) SIM.petCat(world);
  });

  /* ---------- render ---------- */

  function render() {
    // the whole depth-sorted frame — shared with __dev.shot so a headless
    // capture renders the exact same list (js/scene-fx.js)
    SCENE.composeFrame(g, world);
    // present: blit the chosen view of the master at an integer scale
    out.drawImage(master, view.x, view.y, view.w, view.h, 0, 0, canvas.width, canvas.height);
  }

  /* ---------- loop ---------- */

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    SIM.update(world, dt);
    if (SND.ready()) SND.update(dt, world);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // keep the café alive (and audible) if the tab is hidden
  setInterval(function () {
    if (document.hidden) {
      SIM.update(world, 0.25);
      if (SND.ready()) SND.update(0.25, world);
      last = performance.now();
    }
  }, 250);
})();
