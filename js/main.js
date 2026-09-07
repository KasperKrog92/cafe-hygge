/* Café Hygge — boot, loop, viewport manager, and the little control bar */
(function () {
  'use strict';

  function start() {
  /* ---------- canvases ----------
     Everything renders into an offscreen 960×600 master canvas; the visible
     canvas shows the current room's extent (small café or full room),
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
  world.firstEntryReady = new URLSearchParams(location.search).has('dev') || (world.memory.life.firstOpening.step===12 && !SIM.homeSceneActive(world));
  window.__world = world; // handy for tinkering in the console

  /* ---------- viewport manager ----------
     Cover-fit: each room has croppable overscan (full-room height 540–600,
     visible width 936–960), so any window aspect between ~1.56 and 16:9 is
     filled edge-to-edge with zero letterbox. Exact integer device-pixel
     scales (e.g. fullscreen 1920×1080 / 1920×1200 → ×2) present through the
     crisp pixelated path; fractional scales use "sharp bilinear": nearest-
     neighbour upscale to the next integer on the backing canvas, then a
     smooth CSS downscale to the exact window size — full-bleed without
     uneven-pixel shimmer. Aspects outside the overscan budget (ultrawide,
     portrait) get the minimal letterbox on one axis only. */

  const view = { x: 0, y: SCENE.VIEW_Y, w: SCENE.VIEW_W, h: SCENE.VIEW_H };
  const camera=Object.assign({},view);
  let shownRoom = null;

  function fit() {
    const dpr = window.devicePixelRatio || 1;
    const vw = Math.round(stage.clientWidth * dpr);   // viewport in device px
    const vh = Math.round(stage.clientHeight * dpr);
    if (!vw || !vh) return;
    const A = vw / vh;

    // choose the crop window inside the overscan budgets
    const room = SCENE.presentation(world); shownRoom = room;
    let mw = room.w;
    let mh = Math.max(room.minH, Math.min(room.h, Math.round(room.w / A)));
    if (mw / mh > A) mw = Math.max(room.minW, Math.min(room.w, Math.round(mh * A)));
    view.w = mw;
    view.h = mh;
    view.x = (room.w - mw) >> 1;
    // distribute vertical crop like the designed 16:9 crop (36 top / 24 bottom)
    view.y = Math.round((room.h - mh) * (room.top / (room.h - room.minH)));

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
  const introControls=document.getElementById('intro-controls'),introPause=document.getElementById('intro-pause');
  const introTranscript=document.getElementById('intro-transcript'),instantText=document.getElementById('setting-instant');
  let spokenLine='';
  const momentPanel=document.getElementById('conversation'),meetHolger=document.getElementById('meet-holger');
  let momentKey=null,returnFocus=null;
  meetHolger.addEventListener('click',function(){SIM.startHolger(world);refreshMoment();});
  document.getElementById('conversation-later').addEventListener('click',function(){SIM.leaveMoment(world);refreshMoment();});
  function screenPoint(x,y) {
    const r=canvas.getBoundingClientRect(),stageRect=stage.getBoundingClientRect();
    return {x:r.left-stageRect.left+(x-camera.x)/camera.w*r.width,
      y:r.top-stageRect.top+(y-camera.y)/camera.h*r.height,scale:r.width/camera.w};
  }
  function placeHit(button,x,y,width,height) {
    const at=screenPoint(x,y);
    Object.assign(button.style,{left:at.x+'px',top:at.y+'px',width:width*at.scale+'px',height:height*at.scale+'px'});
  }
  function refreshMoment() {
    const visitors=SIM.visitorInvites(world);
    ['keira','tomas'].forEach(function(id){
      const button=document.getElementById('meet-'+id),a=visitors.find(a=>a.visitorId===id);
      button.hidden=!a;
      button.onclick=function(){SIM.startVisitor(world,id);refreshMoment();};
      if(a)placeHit(button,a.x-24,a.y-102,48,42);
    });
    world.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const invited=SIM.holgerAvailable(world);
    meetHolger.hidden=!invited;
    if(invited)placeHit(meetHolger,invited.x-24,invited.y+(invited.pose==='sit'?6:0)-102,48,42);
    const m=world.moment,line=m&&m.phase==='talk'?SIM.momentLine(world):null;
    momentPanel.hidden=!line;
    stage.classList.toggle('in-conversation',!!m);
    btnMode.disabled=!!m;btnHome.disabled=!!m || SIM.holgerRequired(world);
    document.getElementById('conversation-later').textContent=SIM.holgerRequired(world)?'pause conversation':'continue another time';
    const key=line?String(m.index)+line.text:null;
    if(key!==momentKey) {
      const entering=momentKey===null && !!line;momentKey=key;
      if(!line) {if(!m){if(returnFocus && !returnFocus.hidden)returnFocus.focus();else canvas.focus();}}
      else {
        if(entering)returnFocus=document.activeElement;
        document.getElementById('conversation-transcript').textContent=line.speaker+': '+line.text;
        const answers=document.getElementById('conversation-answers');answers.replaceChildren();
        (line.choices || [{text:'reveal or continue dialogue'}]).forEach(function(c,i){
          const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',c.text);
          button.addEventListener('click',function(){SIM.advanceMoment(world,line.choices?i:undefined);refreshMoment();});
          button.addEventListener('pointerenter',function(){if(world.moment)world.moment.hover=i;});
          button.addEventListener('pointerleave',function(){if(world.moment)world.moment.hover=null;});
          button.addEventListener('focus',function(){if(world.moment)world.moment.hover=i;});
          answers.appendChild(button);
        });
        answers.firstElementChild.focus();
      }
    }
    if(!line)return;
    const r=SCENE.dialogueLayout(g,world),buttons=document.getElementById('conversation-answers').children;
    for(let i=0;i<buttons.length;i++) {
      buttons[i].disabled=!!line.choices && m.visible<line.text.length;
      const c=r.choices[i];
      placeHit(buttons[i],r.x,c?r.y+c.top:r.y,r.w,c?c.height:r.h);
    }
  }
  function refreshIntro() {
    const home=SIM.homeSceneActive(world),active=(SIM.introActive(world) || home) && world.firstEntryReady;
    introControls.hidden=(world.shop.phase!=='settling' && !home) || !world.firstEntryReady;
    introControls.setAttribute('aria-label',home?'Evening dialogue':'Opening dialogue');
    document.getElementById('intro-unpack').hidden=home;
    ['intro-next','intro-pause','intro-skip'].forEach(id=>{document.getElementById(id).hidden=!active;});
    document.getElementById('intro-skip').hidden=!active || home;
    introPause.textContent=world.introPaused?'continue':'pause';
    introPause.setAttribute('aria-pressed',String(!!world.introPaused));
    document.getElementById('intro-next').disabled=!world.dialogue || !!world.introPaused;
    const line=active && world.dialogue?world.dialogue.text:'';
    if(line!==spokenLine) {spokenLine=line;introTranscript.textContent=line?'Lunafreya: '+line:'';}
  }
  document.getElementById('intro-next').addEventListener('click',()=>{(SIM.homeSceneActive(world)?SIM.advanceHomeDialogue:SIM.advanceIntro)(world);refreshIntro();});
  introPause.addEventListener('click',()=>{world.introPaused=!world.introPaused;SND.stopDialogue();refreshIntro();});
  document.getElementById('intro-skip').addEventListener('click',()=>{SIM.skipIntro(world);refreshIntro();});
  document.getElementById('intro-unpack').addEventListener('click',()=>{SIM.skipUnpacking(world);refreshIntro();});
  instantText.addEventListener('change',()=>{SND.settings.instantText=instantText.checked;SND.stopDialogue();SND.save();});
  function refreshLife() {
    const l = world.memory.life;
    if (shownSavings !== l.savings) {
      shownSavings = l.savings;
      savingsAmount.textContent = l.savings.toLocaleString('en-GB');
    }
    btnMode.textContent = l.mode;
    btnMode.setAttribute('aria-label', 'presentation: ' + l.mode + '; switch to ' + (l.mode === 'idle' ? 'game' : 'idle'));
    const homeScene=SIM.homeSceneActive(world), required=SIM.homePlanRequired(world);
    btnPlan.hidden=world.shop.phase!=='home' || homeScene || l.mode!=='game' && !l.homeStory.firstNight;
    btnSleep.hidden=btnPlan.hidden;btnSleep.disabled=homeScene || required;
    document.getElementById('close-plan').hidden=required;
    btnHome.hidden = world.shop.phase === 'home' || world.shop.phase==='settling';
    if (!world.plannerOpen && planner.open) planner.close();
    if (!world.plannerOpen) return;
    function refreshChoice(button, stage, price, id) {
      const available = stage === 'available';
      button.hidden=l.homeStory.firstNight && id!=='window' && id!=='table';
      button.disabled = !IMPROVEMENTS.canBuy(world,id);
      button.querySelector('.thought-price > span').textContent = price;
      button.querySelector('.thought-price').hidden = !available;
      const state = button.querySelector('.thought-state');
      state.hidden = available;
      state.textContent = stage === 'installed' ? '✓' : 'chosen';
      button.setAttribute('aria-label', button.firstElementChild.textContent + ', ' +
        (available ? price + ' coins' : stage === 'installed' ? 'complete' : 'chosen'));
    }
    refreshChoice(buyPlant, l.plant.stage, SIM.plantProject.price, 'plant');
    Object.keys(SIM.projects).forEach(function (id) {
      refreshChoice(document.getElementById('buy-' + id), l.projects[id].stage, SIM.projects[id].price,id);
    });
    if(!planner.open && !settings.open && overlay.classList.contains('gone')) {
      planner.showModal();
      if(required)document.getElementById(l.projects.window.stage==='available'?'buy-window':'buy-table').focus();
    }
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
  planner.addEventListener('cancel', function (e) { if(SIM.homePlanRequired(world)){e.preventDefault();return;} SIM.plan(world,false); });
  controls.addEventListener('focusin', function () { pokeControls(); });
  refreshLife();

  function refreshButtons() {
    const S = SND.settings;
    instantText.checked=S.instantText;
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
    world.introModal=true;SND.stopDialogue();
  });
  document.getElementById('close-settings').addEventListener('click', function () { settings.close(); });
  settings.addEventListener('close', function () { world.introModal=false;pokeControls(); btnSettings.focus(); });
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
    this.blur();
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
    if(e.code==='Space' && e.target.tagName!=='BUTTON' && (SIM.introActive(world) || SIM.homeSceneActive(world))) {
      e.preventDefault();(SIM.homeSceneActive(world)?SIM.advanceHomeDialogue:SIM.advanceIntro)(world);return;
    }
    if(e.key==='Escape' && world.moment){SIM.leaveMoment(world);refreshMoment();return;}
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
  // takes it first, otherwise say hello to the cat. The first hello teaches dialogue.
  canvas.addEventListener('click', function (e) {
    if(world.moment || focusAmount>.02)return;
    if(SIM.homeSceneActive(world)) {SIM.advanceHomeDialogue(world);return;}
    if(SIM.introActive(world)) {SIM.advanceIntro(world);return;}
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * view.w + view.x;
    const y = (e.clientY - r.top) / r.height * view.h + view.y;
    const invited=SIM.holgerAvailable(world);
    if(invited && Math.abs(x-invited.x)<26 && y>invited.y-104 && y<invited.y-58){SIM.startHolger(world);return;}
    const visitor=SIM.visitorInvites(world).find(a=>Math.abs(x-a.x)<26 && y>a.y-104 && y<a.y-58);
    if(visitor){SIM.startVisitor(world,visitor.visitorId);return;}
    if (world.memory.life.mode === 'game' && world.shop.phase !== 'home' && SIM.beatAt(world, x, y)) return;
    const cat = world.cat;
    if (Math.hypot(x - cat.x, y - (cat.y - 10)) < 36) SIM.petCat(world);
  });

  /* ---------- render ---------- */

  let focusAmount=0,focusLast=performance.now(),focusPoint={x:400,y:280};
  function render() {
    if (shownRoom !== SCENE.presentation(world)) fit();
    // the whole depth-sorted frame — shared with __dev.shot so a headless
    // capture renders the exact same list (js/scene-fx.js)
    SCENE.composeFrame(g, world);
    // present: blit the chosen view of the master at an integer scale
    const now=performance.now(),delta=Math.min(.1,(now-focusLast)/1000);focusLast=now;
    focusAmount+=(world.moment && world.moment.phase==='talk'?1-focusAmount:-focusAmount)*Math.min(1,delta*5);
    if(world.moment) {
      const owner=world.moment.owner || world.barista,b=world.barista;
      focusPoint={x:(owner.x+b.x)/2,y:Math.min(owner.y,b.y)-28};
    }
    const bubble=world.moment && world.moment.phase==='talk'?SCENE.dialogueLayout(g,world):null;
    let targetZoom=1.3;
    if(bubble) {
      const bottom=Math.max(world.barista.y,world.moment.owner?world.moment.owner.y:world.barista.y)+20;
      targetZoom=Math.max(1,Math.min(targetZoom,view.h/(bottom-bubble.y+20),view.w/(bubble.w+40)));
    }
    const zoom=1+focusAmount*(targetZoom-1),cw=view.w/zoom,ch=view.h/zoom;
    let cx=Math.max(view.x,Math.min(view.x+view.w-cw,focusPoint.x-cw/2));
    let cy=Math.max(view.y,Math.min(view.y+view.h-ch,focusPoint.y-ch*.68));
    if(bubble) {
      cx=Math.max(view.x,Math.min(cx,bubble.x-12));
      cx=Math.min(view.x+view.w-cw,Math.max(cx,bubble.x+bubble.w+12-cw));
      cy=Math.max(view.y,Math.min(cy,bubble.y-12));
      const feet=Math.max(world.barista.y,world.moment.owner?world.moment.owner.y:world.barista.y);
      cy=Math.min(view.y+view.h-ch,Math.max(cy,feet+8-ch));
    }
    // cw/ch already interpolate the zoom; interpolating the clamped origin a
    // second time can cut off speakers at the bottom of the room mid-transition.
    Object.assign(camera,{x:Math.round(cx),y:Math.round(cy),w:Math.round(cw),h:Math.round(ch)});
    out.drawImage(master,camera.x,camera.y,camera.w,camera.h,0,0,canvas.width,canvas.height);

  }

  /* ---------- loop ----------
     One clock, many drivers. `advance` ticks the sim by REAL elapsed time in
     ≤0.25 s chunks (the step size the old hidden-tab path and __dev.ff already
     sanctioned), so it does not matter which driver fires or how throttled it
     is: the visible rAF loop, the hidden-tab interval (throttled to ≥1 s, down
     to once a minute under Chrome's intensive throttling), a merely *slowed*
     rAF (occluded window, energy saver — document.hidden can stay false), or
     the refocus visibilitychange. The old fixed-dt hidden tick lost up to 96%
     of backgrounded time, which starved slow arcs — Nora's canvas never
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
    world.introHidden=document.hidden;
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
    render(); refreshLife();refreshIntro();refreshMoment();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  setInterval(function () { if (document.hidden) advance(performance.now()); }, 250);
  document.addEventListener('visibilitychange', function () {
    world.momentHidden=document.hidden;
    if(world.moment){SND.stopDialogue();last=performance.now();return;}
    if(SIM.introActive(world) || SIM.homeSceneActive(world)) {
      world.introHidden=document.hidden;SND.stopDialogue();last=performance.now();return;
    }
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
