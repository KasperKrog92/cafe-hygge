/* Café Hygge — boot, loop, and the little control bar */
(function () {
  'use strict';

  const canvas = document.getElementById('cafe');
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;

  const world = SIM.create();
  window.__world = world; // handy for tinkering in the console

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
    else document.getElementById('stage').requestFullscreen();
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

  // click the cat to say hello
  canvas.addEventListener('click', function (e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (480 / r.width);
    const y = (e.clientY - r.top) * (270 / r.height);
    const cat = world.cat;
    if (Math.hypot(x - cat.x, y - (cat.y - 4)) < 16) SIM.petCat(world);
  });

  /* ---------- render ---------- */

  function render() {
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
