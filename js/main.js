/* Café Hygge — boot, loop, viewport manager, and the little control bar */
(function () {
  'use strict';

  function start() {
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
  world.firstEntryReady = new URLSearchParams(location.search).has('dev') || world.memory.life.firstOpening.step===12;
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
  const savings = document.getElementById('savings');
  const savingsAmount = document.getElementById('savings-amount');
  const addMoney = document.getElementById('add-money');
  if (new URLSearchParams(location.search).has('dev')) {
    addMoney.disabled = false;
    addMoney.addEventListener('click', function (e) {
      if (MEMORY.readOnly || restarting) return;
      world.memory.life.savings += 100;
      world.context.memory.save();
      if (e.detail) addMoney.blur();
      pokeControls();
    });
    savings.addEventListener('focusin', pokeControls);
  }
  let shownSavings = null;
  const btnMute = document.getElementById('btn-mute');
  const btnSettings = document.getElementById('btn-settings');
  const settings = document.getElementById('settings');
  const settingsMain = document.getElementById('settings-main');
  const resetConfirmation = document.getElementById('reset-confirmation');
  const settingMute = document.getElementById('setting-mute');
  const settingWeather = document.getElementById('setting-weather');
  const soundSliders = settings.querySelectorAll('[data-sound]');
  let restarting = false;
  const btnFull = document.getElementById('btn-full');
  const vol = document.getElementById('vol');
  const btnMode = document.getElementById('btn-mode'), btnPlan = document.getElementById('btn-plan');
  const btnSleep = document.getElementById('btn-sleep');
  const btnHome = document.getElementById('btn-home');
  const planner = document.getElementById('planner'), buyPlant = document.getElementById('buy-plant');
  function refreshLife() {
    const l = world.memory.life;
    if (shownSavings !== l.savings) {
      shownSavings = l.savings;
      savingsAmount.textContent = l.savings.toLocaleString('en-GB');
    }
    btnMode.textContent = l.mode;
    btnMode.setAttribute('aria-label', 'presentation: ' + l.mode + '; switch to ' + (l.mode === 'idle' ? 'game' : 'idle'));
    btnPlan.hidden = l.mode !== 'game' || world.shop.phase !== 'home';
    btnSleep.hidden = btnPlan.hidden;
    btnHome.hidden = world.shop.phase === 'home';
    if (!world.plannerOpen && planner.open) planner.close();
    if (!planner.open) return;
    function refreshChoice(button, stage, price) {
      const available = stage === 'available';
      button.disabled = !available || l.plannedTonight || l.savings < price;
      button.querySelector('.thought-price').hidden = !available;
      const state = button.querySelector('.thought-state');
      state.hidden = available;
      state.textContent = stage === 'installed' ? '✓' : 'chosen';
      button.setAttribute('aria-label', button.firstElementChild.textContent + ', ' +
        (available ? price + ' coins' : stage === 'installed' ? 'complete' : 'chosen'));
    }
    refreshChoice(buyPlant, l.plant.stage, SIM.plantProject.price);
    Object.keys(SIM.projects).forEach(function (id) {
      refreshChoice(document.getElementById('buy-' + id), l.projects[id].stage, SIM.projects[id].price);
    });
  }
  btnMode.addEventListener('click', function () {
    SIM.setMode(world, world.memory.life.mode === 'idle' ? 'game' : 'idle'); refreshLife();
  });
  btnPlan.addEventListener('click', function () {
    if (SIM.plan(world, true)) { planner.showModal(); refreshLife(); }
  });
  buyPlant.addEventListener('click', function () { SIM.buyPlant(world); refreshLife(); });
  Object.keys(SIM.projects).forEach(function (id) {
    document.getElementById('buy-' + id).addEventListener('click', function () { SIM.buyProject(world,id); refreshLife(); });
  });
  btnSleep.addEventListener('click', function () {
    if (SIM.goToSleep(world)) { refreshLife(); btnMode.focus(); }
  });
  btnHome.addEventListener('click', function () {
    if (__dev.home()) { refreshLife(); btnSleep.focus(); }
  });
  document.getElementById('close-plan').addEventListener('click', function () { planner.close(); });
  planner.addEventListener('close', function () { SIM.plan(world,false); btnPlan.focus(); });
  planner.addEventListener('cancel', function () { SIM.plan(world,false); });
  controls.addEventListener('focusin', function () { pokeControls(); });
  refreshLife();

  function refreshButtons() {
    const S = SND.settings;
    btnMute.textContent = S.muted ? '🔇' : '🔊';
    btnMute.classList.toggle('off', S.muted);
    btnMute.setAttribute('aria-label', S.muted ? 'Unmute sound (m)' : 'Mute sound (m)');
    btnMute.setAttribute('aria-pressed', String(S.muted));
    settingMute.setAttribute('aria-pressed', String(S.muted));
    settingMute.textContent = S.muted ? 'unmute' : 'mute all';
    settingWeather.checked = S.rain;
    vol.value = Math.round(S.volume * 100);
    soundSliders.forEach(function (slider) {
      const key = slider.dataset.sound, toggle = key.replace('Volume', '');
      const value = toggle !== 'rain' && S[toggle] === false ? 0 : Math.round(S[key] * 100);
      slider.value = value;
      slider.nextElementSibling.value = value + '%';
    });
  }

  function showResetConfirmation(show) {
    settingsMain.hidden = show;
    resetConfirmation.hidden = !show;
    document.getElementById('reset-error').hidden = true;
    document.getElementById(show ? 'cancel-reset' : 'start-over').focus();
  }
  btnSettings.addEventListener('click', function () {
    restoreBurstMute(); refreshButtons();
    settingsMain.hidden = false; resetConfirmation.hidden = true;
    settings.showModal();
  });
  document.getElementById('close-settings').addEventListener('click', function () { settings.close(); });
  settings.addEventListener('close', function () { pokeControls(); btnSettings.focus(); });
  settings.addEventListener('cancel', function (e) {
    if (!resetConfirmation.hidden) { e.preventDefault(); showResetConfirmation(false); }
  });
  soundSliders.forEach(function (slider) {
    slider.addEventListener('input', function () {
      restoreBurstMute();
      const key = slider.dataset.sound, toggle = key.replace('Volume', '');
      SND.settings[key] = slider.value / 100;
      // Older saves keep their off toggles until the owner adjusts that mix.
      if (toggle === 'fire' || toggle === 'music') SND.settings[toggle] = true;
      SND.applyVolume(); SND.applyToggles(); SND.save(); refreshButtons();
    });
  });
  settingMute.addEventListener('click', function () { btnMute.click(); });
  settingWeather.addEventListener('change', function () {
    restoreBurstMute(); SND.settings.rain = settingWeather.checked;
    SND.applyToggles(); SND.save(); refreshButtons();
  });
  document.getElementById('reset-sound').addEventListener('click', function () {
    restoreBurstMute(); SND.resetSettings(); refreshButtons();
  });
  document.getElementById('start-over').addEventListener('click', function () { showResetConfirmation(true); });
  document.getElementById('cancel-reset').addEventListener('click', function () { showResetConfirmation(false); });
  document.getElementById('confirm-reset').addEventListener('click', function () {
    if (restarting) return;
    const previous = MEMORY.state;
    MEMORY.reset();
    if (MEMORY.status.writeError) {
      MEMORY.state = previous;
      const error = document.getElementById('reset-error');
      error.textContent = 'Your browser could not erase the save. Your café is still here. Please try again.';
      error.hidden = false;
      return;
    }
    // Stop the old world and unload handlers from writing progress back.
    restarting = true; MEMORY.readOnly = true;
    location.replace(location.pathname);
  });
  refreshButtons();

  document.getElementById('enter').addEventListener('click', function () {
    world.firstEntryReady=true;
    SND.init();
    overlay.classList.add('gone');
    controls.classList.remove('hidden');
    refreshButtons();
    pokeControls();
  });

  btnMute.addEventListener('click', function () {
    restoreBurstMute();
    SND.settings.muted = !SND.settings.muted;
    SND.applyVolume(); SND.save(); refreshButtons();
  });
  btnFull.addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else stage.requestFullscreen();
  });
  vol.addEventListener('input', function () {
    restoreBurstMute();
    SND.settings.volume = vol.value / 100;
    SND.applyVolume(); SND.save(); refreshButtons();
  });

  document.addEventListener('keydown', function (e) {
    if (settings.open || planner.open || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.key === 'm') btnMute.click();
    if (e.key === 'f') btnFull.click();
  });

  // controls fade away when the mouse rests
  let fadeTimer = null;
  function pokeControls() {
    controls.classList.remove('faded');
    if (overlay.classList.contains('gone')) {
      refreshLife();
      savings.classList.add('visible');
    }
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(function () {
      controls.classList.add('faded');
      savings.classList.remove('visible');
    }, 3200);
  }
  document.addEventListener('mousemove', pokeControls);

  // a click (client coords → master-canvas coords): a waiting story invitation
  // takes it first, otherwise say hello to the cat. Both are optional and soft.
  canvas.addEventListener('click', function (e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * view.w + view.x;
    const y = (e.clientY - r.top) / r.height * view.h + view.y;
    if (world.memory.life.mode === 'game' && world.shop.phase !== 'home' && SIM.beatAt(world, x, y)) return;
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

  /* ---------- loop ----------
     One clock, many drivers. `advance` ticks the sim by REAL elapsed time in
     ≤0.25 s chunks (the step size the old hidden-tab path and __dev.ff already
     sanctioned), so it does not matter which driver fires or how throttled it
     is: the visible rAF loop, the hidden-tab interval (throttled to ≥1 s, down
     to once a minute under Chrome's intensive throttling), a merely *slowed*
     rAF (occluded window, energy saver — document.hidden can stay false), or
     the refocus visibilitychange. The old fixed-dt hidden tick lost up to 96%
     of backgrounded time, which starved slow arcs — Lunafreya's canvas never
     visibly advanced for a reader who kept the café in a background tab.
     A burst over a couple of seconds mutes its flood of one-shots (the
     __dev.ff pattern); a gap beyond 90 s (a frozen tab, a sleeping laptop) is
     dropped — that café simply held still, which the narrative allows. */
  let hiddenMute = null;
  function restoreBurstMute() {
    if (!hiddenMute) return;
    clearTimeout(hiddenMute.timer);
    SND.settings.muted = hiddenMute.muted;
    SND.applyVolume(); hiddenMute = null;
  }
  function muteBurst() {
    if (!SND.ready()) return;
    if (hiddenMute) clearTimeout(hiddenMute.timer);
    else {
      hiddenMute = { muted: SND.settings.muted };
      SND.settings.muted = true;
      SND.applyVolume();
    }
    hiddenMute.timer = setTimeout(restoreBurstMute, 1500);
  }
  let last = performance.now();
  function advance(nowMs) {
    if (restarting) return;
    let elapsed = Math.min(90, (nowMs - last) / 1000);
    last = nowMs;
    if (elapsed <= 0) return;
    if (elapsed > 2) muteBurst();
    while (elapsed > 0) {
      const step = Math.min(0.25, elapsed);
      SIM.update(world, step);
      if (SND.ready()) SND.update(step, world);
      elapsed -= step;
    }
  }
  function frame(now) {
    advance(now);
    render(); refreshLife();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  setInterval(function () { if (document.hidden) advance(performance.now()); }, 250);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) advance(performance.now());
  });
  }
  function ready() { start(); window.dispatchEvent(new Event('cafe-ready')); }
  function holdOwnership() {
    return new Promise(function(release) {
      window.addEventListener('pagehide', function () { MEMORY.readOnly = true; release(); }, {once:true});
    });
  }
  window.addEventListener('pageshow', function(e) {
    if (e.persisted) location.reload(); // reacquire and re-read after back/forward cache
  });
  if (navigator.locks) {
    navigator.locks.request('cafe-hygge-life', {ifAvailable:true}, function(lock) {
      if (lock) { MEMORY.readOnly = false; MEMORY.load(); ready(); return holdOwnership(); }
      document.querySelector('.overlay-card .sub').textContent = 'the café is open in another tab; this window will join when it closes';
      document.getElementById('overlay').classList.remove('gone');
      document.getElementById('enter').disabled = true;
      return navigator.locks.request('cafe-hygge-life', function() {
        MEMORY.readOnly = false; MEMORY.load(); document.getElementById('enter').disabled = false;
        document.querySelector('.overlay-card .sub').textContent = 'a tiny café that putters along while you read'; ready();
        return holdOwnership();
      });
    });
  } else ready(); // file:// and older browsers retain the dependency-free boot.
})();
