/* Café Hygge — procedural sound engine (Web Audio, no samples) */
(function () {
  'use strict';

  const SND = (window.SND = {});

  let ctx = null;
  let master, sfx, amb, musicBus, fireBus, delaySend, nightGain;
  let noiseBuf = null;
  let stormGain = null;
  let stormLfo1, stormLfo2, stormSwell1, stormSwell2;

  const S = (SND.settings = { volume: 0.7, muted: false, rain: true, fire: true, music: true });
  try { Object.assign(S, JSON.parse(localStorage.getItem('cafe-hygge-audio') || '{}')); } catch (e) {}

  SND.save = function () {
    try { localStorage.setItem('cafe-hygge-audio', JSON.stringify(S)); } catch (e) {}
  };

  SND.ready = function () { return !!ctx; };

  function makeNoiseBuffer() {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function noiseSrc(loop) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = !!loop;
    if (loop) s.loopStart = 0;
    return s;
  }

  function filt(type, freq, q) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (q !== undefined) f.Q.value = q;
    return f;
  }

  function gainNode(v) {
    const g = ctx.createGain();
    g.gain.value = v;
    return g;
  }

  SND.init = function () {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 22;
    comp.ratio.value = 5;
    comp.attack.value = 0.01;
    comp.release.value = 0.3;
    comp.connect(ctx.destination);

    master = gainNode(S.muted ? 0 : S.volume);
    master.connect(comp);

    sfx = gainNode(1); sfx.connect(master);
    amb = gainNode(1); amb.connect(master);
    fireBus = gainNode(S.fire ? 1 : 0); fireBus.connect(master);
    musicBus = gainNode(S.music ? 1 : 0); musicBus.connect(master);
    nightGain = gainNode(0); nightGain.connect(musicBus);

    // a soft "room" — feedback delay standing in for reverb
    const dly = ctx.createDelay(1.0);
    dly.delayTime.value = 0.31;
    const damp = filt('lowpass', 1700);
    const fb = gainNode(0.34);
    dly.connect(damp); damp.connect(fb); fb.connect(dly);
    const wet = gainNode(0.2);
    damp.connect(wet); wet.connect(master);
    delaySend = gainNode(1);
    delaySend.connect(dly);

    noiseBuf = makeNoiseBuffer();
    startStormWash();
  };

  SND.applyVolume = function () {
    if (!ctx) return;
    master.gain.setTargetAtTime(S.muted ? 0 : S.volume, ctx.currentTime, 0.05);
  };
  SND.applyToggles = function () {
    if (!ctx) return;
    fireBus.gain.setTargetAtTime(S.fire ? 1 : 0, ctx.currentTime, 0.4);
    musicBus.gain.setTargetAtTime(S.music ? 1 : 0, ctx.currentTime, 0.4);
  };

  /* ---------- ambience loops ---------- */

  function startStormWash() {
    const src = noiseSrc(true);
    const hp = filt('highpass', 360);
    const lp1 = filt('lowpass', 2300);
    const lp2 = filt('lowpass', 1400);
    stormGain = gainNode(0);
    src.connect(hp); hp.connect(lp1); lp1.connect(lp2); lp2.connect(stormGain); stormGain.connect(amb);
    src.start();

    // Two slow, wandering swells keep the rain bed from settling into a loop.
    // Their depth is scaled alongside the base gain, so clear weather is silent.
    stormLfo1 = ctx.createOscillator();
    stormLfo1.frequency.value = 0.07;
    stormSwell1 = gainNode(0);
    stormLfo1.connect(stormSwell1); stormSwell1.connect(stormGain.gain);
    stormLfo1.start();
    stormLfo2 = ctx.createOscillator();
    stormLfo2.frequency.value = 0.121;
    stormSwell2 = gainNode(0);
    stormLfo2.connect(stormSwell2); stormSwell2.connect(stormGain.gain);
    stormLfo2.start();
  }

  /* A single fire crackle — the fireplace's whole voice now that the constant
     rumble is gone. `level` (0..1, the live burn) scales its loudness and the
     odds of a deep pop, so a blaze snaps and embers only tick softly. */
  function playCrackle(level) {
    level = level == null ? 1 : level;
    const t = ctx.currentTime;
    const src = noiseSrc(false);
    const bp = filt('bandpass', 700 + Math.random() * 2800, 2.2);
    const g = gainNode(0);
    src.connect(bp); bp.connect(g); g.connect(fireBus);
    const peak = (0.008 + Math.random() * 0.03) * (0.5 + level * 0.6);
    const dur = 0.015 + Math.random() * 0.05;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
    src.start(t, Math.random() * 1.5, dur + 0.05);
    if (Math.random() < 0.05 * level) { // occasional deep pop, rare at embers
      const o = ctx.createOscillator();
      o.frequency.value = 70 + Math.random() * 40;
      const og = gainNode(0);
      o.connect(og); og.connect(fireBus);
      og.gain.setValueAtTime(0.05, t);
      og.gain.exponentialRampToValueAtTime(0.0005, t + 0.09);
      o.start(t); o.stop(t + 0.1);
    }
  }

  /* One raindrop reaching the window: a tiny damped tick, mostly high and
     glassy. Sometimes a fatter drop lands on the frame or sill instead. */
  function playWindowTap() {
    if (Math.random() < 0.18) {
      hiss({ dur: 0.05, gain: 0.009 + Math.random() * 0.009,
             bp: 800 + Math.random() * 500, q: 3.5,
             attack: 0.002, release: 0.045, dest: amb });
    } else {
      hiss({ dur: 0.022 + Math.random() * 0.014, gain: 0.008 + Math.random() * 0.014,
             bp: 2300 + Math.random() * 2300, q: 7,
             attack: 0.001, release: 0.02, dest: amb });
    }
  }

  /* ---------- one-shot helpers ---------- */

  function tone(freq, opts) {
    // opts: {type, gain, dur, attack, delay, dest, lp, sweepTo, sweepDur, send}
    const t = ctx.currentTime + (opts.delay || 0);
    const o = ctx.createOscillator();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.sweepTo) o.frequency.exponentialRampToValueAtTime(opts.sweepTo, t + (opts.sweepDur || opts.dur));
    const g = gainNode(0);
    if (opts.lp) {
      const lp = filt('lowpass', opts.lp);
      o.connect(lp); lp.connect(g);
    } else o.connect(g);
    g.connect(opts.dest || sfx);
    if (opts.send) { const sg = gainNode(opts.send); g.connect(sg); sg.connect(delaySend); }
    const a = opts.attack || 0.004;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(opts.gain, t + a);
    g.gain.exponentialRampToValueAtTime(0.0004, t + opts.dur);
    o.start(t);
    o.stop(t + opts.dur + 0.05);
  }

  function hiss(opts) {
    // filtered noise burst. opts: {dur, gain, attack, release, delay, hp, lp, bp, q, dest, sweep:[from,to,onWhat]}
    const t = ctx.currentTime + (opts.delay || 0);
    const src = noiseSrc(false);
    let node = src;
    let bpf = null;
    if (opts.hp) { const f = filt('highpass', opts.hp); node.connect(f); node = f; }
    if (opts.lp) { const f = filt('lowpass', opts.lp); node.connect(f); node = f; }
    if (opts.bp) { bpf = filt('bandpass', opts.bp, opts.q || 1); node.connect(bpf); node = bpf; }
    if (opts.sweep && bpf) {
      bpf.frequency.setValueAtTime(opts.sweep[0], t);
      bpf.frequency.exponentialRampToValueAtTime(opts.sweep[1], t + opts.dur);
    }
    const g = gainNode(0);
    node.connect(g);
    g.connect(opts.dest || sfx);
    const a = opts.attack || 0.01;
    const r = opts.release || 0.05;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(opts.gain, t + a);
    g.gain.setValueAtTime(opts.gain, t + Math.max(a, opts.dur - r));
    g.gain.linearRampToValueAtTime(0, t + opts.dur);
    src.start(t, Math.random() * 1.2, opts.dur + 0.1);
    return g;
  }

  function guard(fn) {
    return function () {
      if (!ctx || S.muted) return;
      try { fn.apply(null, arguments); } catch (e) {}
    };
  }

  /* ---------- the café's sounds ---------- */

  SND.doorBell = guard(function () {
    const base = 1244 * (0.98 + Math.random() * 0.04);
    [0, 0.09, 0.19].forEach(function (dt, i) {
      setTimeout(function () {
        if (!ctx) return;
        const f = base * [1, 1.335, 1][i] * (0.99 + Math.random() * 0.02);
        tone(f, { gain: 0.075, dur: 1.1, send: 0.5 });
        tone(f * 2.76, { gain: 0.02, dur: 0.5 });
      }, dt * 1000);
    });
  });

  SND.doorClose = guard(function () {
    tone(95, { gain: 0.06, dur: 0.12, sweepTo: 55 });
    hiss({ dur: 0.06, gain: 0.04, lp: 500, attack: 0.003 });
  });

  SND.clink = guard(function (pitch, vol) {
    pitch = pitch || 1;
    const f = 2350 * pitch * (0.94 + Math.random() * 0.12);
    tone(f, { gain: (vol || 0.055), dur: 0.09, send: 0.35 });
    tone(f * 1.51, { gain: (vol || 0.055) * 0.4, dur: 0.06 });
    tone(f * 2.63, { gain: (vol || 0.055) * 0.2, dur: 0.045 });
  });

  SND.chairScrape = guard(function (long) {
    const dur = long ? 0.16 : 0.09 + Math.random() * 0.05;
    hiss({ dur: dur, gain: 0.02 + Math.random() * 0.008,
      lp: 900, bp: 380 + Math.random() * 270, q: 1.6,
      attack: 0.008, release: long ? 0.08 : 0.05 });
    if (long) {
      hiss({ dur: 0.075, gain: 0.011 + Math.random() * 0.003, delay: 0.06,
        lp: 820, bp: 340 + Math.random() * 220, q: 1.5,
        attack: 0.006, release: 0.05 });
    }
  });

  SND.coins = guard(function () {
    const count = 2 + ((Math.random() * 2) | 0);
    let delay = 0;
    for (let i = 0; i < count; i++) {
      const f = 2900 + Math.random() * 1300;
      const peak = 0.011 + Math.random() * 0.003;
      tone(f, { gain: peak, dur: 0.035 + Math.random() * 0.025,
        delay: delay, lp: 5200, send: 0.15 });
      tone(f * 1.43, { gain: peak * 0.38, dur: 0.03 + Math.random() * 0.018,
        delay: delay, lp: 5200 });
      delay += 0.04 + Math.random() * 0.05;
    }
  });

  SND.cupDown = guard(function () {
    tone(260, { gain: 0.035, dur: 0.05 });
    SND.clink(0.62, 0.04);
  });

  // knitting needles — a soft wooden tick, quieter than the fire crackle, with
  // an occasional second tap as the next stitch lands (Gerda's scarf arc)
  SND.needle = guard(function () {
    const f = 540 + Math.random() * 110;
    tone(f, { gain: 0.013, dur: 0.045, lp: 2600 });
    tone(f * 1.72, { gain: 0.006, dur: 0.03, lp: 3200, delay: 0.008 });
    if (Math.random() < 0.5) tone(f * 0.95, { gain: 0.009, dur: 0.04, lp: 2400, delay: 0.1 + Math.random() * 0.05 });
  });

  SND.umbrellaShake = guard(function () {
    const flaps = 3 + ((Math.random() * 2) | 0);
    for (let i = 0; i < flaps; i++) {
      setTimeout(function () {
        if (!ctx || S.muted) return;
        hiss({ dur: 0.06, gain: 0.022 + Math.random() * 0.008,
          lp: 900, bp: 620 + Math.random() * 260, q: 0.7, attack: 0.005, release: 0.04 });
      }, i * (82 + Math.random() * 20));
    }
  });

  SND.shoeWipe = guard(function () {
    // two or three dull back-and-forth scuffs on the coir mat — softer and
    // lower than a chair scrape, spaced like real foot passes
    const scuffs = 2 + ((Math.random() * 2) | 0);
    for (let i = 0; i < scuffs; i++) {
      setTimeout(function () {
        if (!ctx || S.muted) return;
        hiss({ dur: 0.11 + Math.random() * 0.05, gain: 0.013 + Math.random() * 0.006,
          lp: 640, bp: 300 + Math.random() * 150, q: 1.1,
          attack: 0.012, release: 0.06 });
      }, i * (150 + Math.random() * 60));
    }
  });

  SND.keys = guard(function () {
    const ticks = 2 + ((Math.random() * 3) | 0);
    for (let i = 0; i < ticks; i++) {
      setTimeout(function () {
        if (!ctx || S.muted) return;
        hiss({ dur: 0.018, gain: 0.014 + Math.random() * 0.006,
          bp: 2100 + Math.random() * 900, q: 2.1, attack: 0.002, release: 0.012 });
      }, i * (32 + Math.random() * 28));
    }
  });

  SND.ding = guard(function () {
    tone(1720, { gain: 0.07, dur: 0.75, send: 0.5 });
    tone(1720 * 2.7, { gain: 0.022, dur: 0.3 });
  });

  SND.grinder = guard(function (dur) {
    dur = dur || 1.4;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 55 + Math.random() * 8;
    const lp = filt('lowpass', 320);
    const g = gainNode(0);
    o.connect(lp); lp.connect(g); g.connect(sfx);
    // motor AM wobble
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 26;
    const lg = gainNode(0.012);
    lfo.connect(lg); lg.connect(g.gain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.035, t + 0.06);
    g.gain.setValueAtTime(0.035, t + dur - 0.12);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
    lfo.start(t); lfo.stop(t + dur + 0.05);
    hiss({ dur: dur, gain: 0.028, bp: 850, q: 0.9, attack: 0.06, release: 0.15 });
  });

  SND.tamp = guard(function () {
    tone(185, { gain: 0.07, dur: 0.05 });
    hiss({ dur: 0.03, gain: 0.03, lp: 900, attack: 0.002 });
  });

  SND.espresso = guard(function (dur) {
    dur = dur || 2.2;
    hiss({ dur: dur, gain: 0.04, bp: 1300, q: 0.8, sweep: [1600, 850], attack: 0.35, release: 0.5 });
    tone(52, { gain: 0.018, dur: dur, attack: 0.3 });
  });

  SND.steamWand = guard(function (dur) {
    dur = dur || 1.6;
    const g = hiss({ dur: dur, gain: 0.035, hp: 1900, attack: 0.05, release: 0.2 });
    // sputter
    const t = ctx.currentTime;
    const steps = 14;
    const curve = new Float32Array(steps);
    for (let i = 0; i < steps; i++) curve[i] = 0.02 + Math.random() * 0.025;
    curve[0] = 0.001; curve[steps - 1] = 0.001;
    try { g.gain.setValueCurveAtTime(curve, t + 0.02, dur - 0.05); } catch (e) {}
  });

  SND.kettlePour = guard(function (dur) {
    dur = dur || 1.8;
    hiss({ dur: dur, gain: 0.04, bp: 900, q: 1.1, sweep: [700, 2100], attack: 0.15, release: 0.3 });
    // little bubbles
    for (let i = 0; i < 4; i++) {
      setTimeout(function () {
        if (ctx) tone(280 + Math.random() * 220, { gain: 0.016, dur: 0.05 });
      }, 300 + Math.random() * (dur * 700));
    }
  });

  SND.whisk = guard(function (dur) {
    dur = dur || 2.2;
    const t = ctx.currentTime;
    const envelope = gainNode(0);
    envelope.connect(sfx);
    envelope.gain.setValueAtTime(0, t);
    envelope.gain.linearRampToValueAtTime(1, t + Math.min(0.15, dur * 0.25));
    envelope.gain.setValueAtTime(1, t + Math.max(0.15, dur - 0.2));
    envelope.gain.linearRampToValueAtTime(0, t + dur);
    let at = 0;
    while (at < dur - 0.02) {
      const tickDur = 0.014 + Math.random() * 0.01;
      hiss({ dur: tickDur, gain: 0.012 + Math.random() * 0.008,
        delay: at, bp: 1500 + Math.random() * 900, q: 2.5,
        attack: 0.003, release: Math.max(0.006, tickDur - 0.003), dest: envelope });
      at += 0.055 + Math.random() * 0.03;
    }
  });

  SND.iceRattle = guard(function () {
    const count = 3 + ((Math.random() * 2) | 0);
    let delay = 0;
    for (let i = 0; i < count; i++) {
      const f = 2600 + Math.random() * 800;
      const peak = 0.014 + Math.random() * 0.002;
      const dur = 0.04 + Math.random() * 0.03;
      tone(f, { gain: peak, dur: dur, delay: delay, send: 0.15 });
      tone(f * 1.51, { gain: peak * 0.38, dur: dur * 0.75, delay: delay });
      tone(f * 2.63, { gain: peak * 0.2, dur: dur * 0.6, delay: delay });
      delay += 0.06 + Math.random() * 0.06;
    }
  });

  SND.chalkTick = guard(function () {
    hiss({ dur: 0.045 + Math.random() * 0.025, gain: 0.02 + Math.random() * 0.005,
      bp: 2200 + Math.random() * 900, q: 2.4, hp: 1200, attack: 0.003, release: 0.035 });
  });

  SND.waterPour = guard(function (dur) {
    dur = dur || 1.2;
    hiss({ dur: dur, gain: 0.03, bp: 620, q: 0.8, lp: 1500,
      sweep: [520, 980], attack: 0.12, release: 0.25 });
  });

  SND.matchStrike = guard(function () {
    hiss({ dur: 0.1, gain: 0.028, bp: 1800, q: 1.4, hp: 700, attack: 0.004, release: 0.07 });
    setTimeout(function () {
      if (!ctx || S.muted) return;
      hiss({ dur: 0.2, gain: 0.012, hp: 2400, attack: 0.015, release: 0.16 });
    }, 55);
  });

  SND.candlePop = guard(function () {
    hiss({ dur: 0.09, gain: 0.018, bp: 1250, q: 0.7, lp: 2200,
      attack: 0.015, release: 0.06 });
  });

  /* A fresh log going on the fire: the dull settle of the wood, a soft low
     whoomph as it catches, and a scatter of new crackles as it takes. Routed
     through the fire bus so the 🔥 toggle owns it too. */
  SND.fireCatch = guard(function () {
    const t = ctx.currentTime;
    tone(84, { gain: 0.03, dur: 0.13, sweepTo: 54, sweepDur: 0.11, dest: fireBus });
    const src = noiseSrc(false);
    const lp = filt('lowpass', 440);
    const g = gainNode(0);
    src.connect(lp); lp.connect(g); g.connect(fireBus);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 1.1);
    src.start(t, Math.random() * 1.0, 1.2);
    for (let i = 0; i < 5; i++) {
      setTimeout(function () {
        if (ctx && !S.muted) playCrackle(1);
      }, 130 + i * (90 + Math.random() * 130));
    }
  });

  SND.pageTurn = guard(function () {
    hiss({ dur: 0.16, gain: 0.028, bp: 1500, q: 0.7, sweep: [1100, 2400], attack: 0.03, release: 0.06 });
  });

  SND.sip = guard(function () {
    hiss({ dur: 0.13, gain: 0.016, hp: 2800, attack: 0.04, release: 0.05 });
  });

  SND.swish = guard(function () {
    hiss({ dur: 0.32, gain: 0.022, lp: 950, attack: 0.1, release: 0.14 });
  });

  SND.murmur = guard(function (baseFreq) {
    const f0 = (baseFreq || 150) * (0.9 + Math.random() * 0.2);
    const t = ctx.currentTime;
    const dur = 0.5 + Math.random() * 0.6;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f0 * (1.05 + Math.random() * 0.12), t + dur * 0.4);
    o.frequency.linearRampToValueAtTime(f0 * (0.92 + Math.random() * 0.08), t + dur);
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.5;
    const vg = gainNode(f0 * 0.03);
    vib.connect(vg); vg.connect(o.frequency);
    const lp = filt('lowpass', 480);
    const g = gainNode(0);
    o.connect(lp); lp.connect(g); g.connect(sfx);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.018, t + 0.1);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
    vib.start(t); vib.stop(t + dur + 0.05);
  });

  SND.meow = guard(function () {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(620, t);
    o.frequency.linearRampToValueAtTime(890, t + 0.14);
    o.frequency.linearRampToValueAtTime(500, t + 0.34);
    const bp = filt('bandpass', 900, 1.8);
    const g = gainNode(0);
    o.connect(bp); bp.connect(g); g.connect(sfx);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.035, t + 0.05);
    g.gain.linearRampToValueAtTime(0, t + 0.36);
    o.start(t); o.stop(t + 0.4);
  });

  SND.purr = guard(function (dur) {
    dur = dur || 2.2;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 24;
    const lp = filt('lowpass', 95);
    const g = gainNode(0);
    o.connect(lp); lp.connect(g); g.connect(sfx);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.028, t + 0.4);
    g.gain.setValueAtTime(0.028, t + dur - 0.5);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
  });

  SND.crunch = guard(function () {
    const ticks = 3 + ((Math.random() * 3) | 0);
    for (let i = 0; i < ticks; i++) {
      setTimeout(function () {
        if (!ctx || S.muted) return;
        hiss({ dur: 0.03, gain: 0.014 + Math.random() * 0.006,
          bp: 1050 + Math.random() * 350, q: 1.7, attack: 0.002, release: 0.018 });
      }, i * (35 + Math.random() * 22));
    }
  });

  SND.lapWater = guard(function () {
    tone(330 + Math.random() * 80, { gain: 0.009, dur: 0.045, sweepTo: 250 });
    hiss({ dur: 0.04, gain: 0.006, bp: 1500, q: 0.8, attack: 0.004, release: 0.025 });
  });

  SND.kibblePour = guard(function (dur) {
    dur = dur || 0.9;
    const grains = 10;
    for (let i = 0; i < grains; i++) {
      setTimeout(function () {
        if (!ctx || S.muted) return;
        const fade = 1 - i / grains;
        hiss({ dur: 0.035 + Math.random() * 0.035, gain: 0.012 + 0.023 * fade,
          bp: 900 + Math.random() * 1900, q: 0.9, lp: 3000, attack: 0.003, release: 0.025 });
      }, (i / grains) * dur * 1000 + Math.random() * 35);
    }
  });

  SND.softThump = guard(function () {
    tone(90, { gain: 0.03, dur: 0.12, sweepTo: 58, sweepDur: 0.1 });
    hiss({ dur: 0.045, gain: 0.012, lp: 480, attack: 0.002, release: 0.035 });
  });

  SND.churchBells = guard(function () {
    let delay = 0;
    for (let i = 0; i < 4; i++) {
      const f = 330 * (0.99 + Math.random() * 0.02);
      const dur = 2.5 + Math.random();
      tone(f, { gain: 0.012, dur: dur, attack: 0.025, delay: delay,
        lp: 1200, send: 0.72, type: 'triangle' });
      tone(f * 1.2, { gain: 0.0045, dur: dur * 0.82, attack: 0.025,
        delay: delay, lp: 1200, send: 0.55, type: 'triangle' });
      tone(f * 2, { gain: 0.0025, dur: dur * 0.65, attack: 0.018,
        delay: delay, lp: 1200, send: 0.45 });
      delay += 1.7 + Math.random() * 0.4;
    }
  });

  SND.mantelChime = guard(function () {
    tone(740, { gain: 0.012, dur: 1.2, attack: 0.018,
      lp: 1500, send: 0.42, type: 'triangle' });
    tone(1480, { gain: 0.003, dur: 0.85, attack: 0.018, lp: 1500 });
    tone(620, { gain: 0.012, dur: 1.2, attack: 0.018, delay: 0.45,
      lp: 1400, send: 0.42, type: 'triangle' });
    tone(1240, { gain: 0.003, dur: 0.85, attack: 0.018, delay: 0.45, lp: 1400 });
  });

  SND.kettleWhistle = guard(function () {
    const t = ctx.currentTime;
    const dur = 5.2;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1600, t);
    o.frequency.exponentialRampToValueAtTime(1656, t + 2);
    o.frequency.setValueAtTime(1656, t + 4.65);
    o.frequency.exponentialRampToValueAtTime(1380, t + dur);
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 5;
    const wobbleDepth = gainNode(7);
    wobble.connect(wobbleDepth); wobbleDepth.connect(o.frequency);
    const lp = filt('lowpass', 1000);
    const g = gainNode(0);
    o.connect(lp); lp.connect(g); g.connect(sfx);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.018, t + 1.2);
    g.gain.setValueAtTime(0.018, t + 3.7);
    g.gain.linearRampToValueAtTime(0.008, t + 4.65);
    g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
    wobble.start(t); wobble.stop(t + dur + 0.05);
  });

  SND.thunder = guard(function () {
    const t = ctx.currentTime;
    const dur = 2.8 + Math.random() * 2.2;
    const src = noiseSrc(true);
    const lp = filt('lowpass', 140);
    lp.frequency.setValueAtTime(140, t);
    lp.frequency.exponentialRampToValueAtTime(70, t + dur);
    const g = gainNode(0);
    src.connect(lp); lp.connect(g); g.connect(amb);
    const roll = new Float32Array([0, 0.18, 0.62, 0.32, 0.84, 0.48, 1, 0.38, 0.58, 0.16, 0]);
    for (let i = 0; i < roll.length; i++) roll[i] *= 0.044;
    g.gain.setValueCurveAtTime(roll, t, dur);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);

    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = 45 + Math.random() * 15;
    const og = gainNode(0);
    o.connect(og); og.connect(amb);
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime(0.008, t + dur * 0.48);
    og.gain.exponentialRampToValueAtTime(0.0004, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
  });

  /* ---------- music box ---------- */

  const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66]; // C major pentatonic-ish, two octaves reach
  let noteIdx = 2;
  let musicT = 4;
  let pianoActive = false;
  let pianoStyle = 'patron';
  let pianoLeftT = 0, pianoRightT = 0, pianoChordT = 0;
  let pianoChord = 0, pianoFigure = 0, pianoFigureStep = 0, pianoRightIdx = 2;

  function playNote(f, vel) {
    tone(f, { gain: vel, dur: 1.7, type: 'triangle', dest: musicBus, send: 0.7, attack: 0.006 });
    tone(f * 2, { gain: vel * 0.25, dur: 1.1, dest: musicBus });
  }

  /* A soft felt-piano voice. Three restrained partials share one lowpass and
     envelope, so the stated peak is the whole note rather than three stacked
     peaks. This is also the single swap point for a future felt-piano sample. */
  function pianoNote(f, vel, delay) {
    if (!ctx) return;
    const t = ctx.currentTime + (delay || 0);
    const dur = 1.6 + Math.random() * 0.8;
    const lp = filt('lowpass', 1900);
    const g = gainNode(0);
    lp.connect(g); g.connect(musicBus);
    const send = gainNode(0.42); g.connect(send); send.connect(delaySend);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(Math.min(0.024, 0.022 * vel), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
    [
      { type: 'triangle', mul: 1, gain: 1 },
      { type: 'sine', mul: 2, gain: 0.18 },
      { type: 'sine', mul: 2.9, gain: 0.07 }
    ].forEach(function (v) {
      const o = ctx.createOscillator();
      const og = gainNode(v.gain);
      o.type = v.type; o.frequency.value = f * v.mul;
      o.connect(og); og.connect(lp);
      o.start(t); o.stop(t + dur + 0.05);
    });
  }

  // Root–fifth–tenth shapes using only the C-pentatonic pitch well. The
  // third entry is deliberately F-ish by inversion instead of adding an F.
  const PIANO_CHORDS = [
    [130.81, 196.00, 329.63],
    [110.00, 164.81, 261.63],
    [110.00, 130.81, 164.81],
    [98.00, 146.83, 220.00]
  ];
  const PIANO_NEXT = [[1, 2], [2, 3], [0, 3], [0, 1]];
  const PIANO_FIGURES = [[0, 1, 2, 1], [0, 2, 1, 2], [0, 1, 0, 2, 1]];

  SND.pianoStart = function (style) {
    pianoStyle = style === 'nora' ? 'nora' : 'patron';
    if (pianoActive) return;
    pianoActive = true;
    pianoLeftT = 0; pianoRightT = 0.7 + Math.random() * 1.2;
    pianoChordT = 8 + Math.random() * 8;
    pianoFigure = (Math.random() * PIANO_FIGURES.length) | 0;
    pianoFigureStep = 0;
  };

  SND.pianoStop = function () {
    if (!pianoActive) return;
    pianoActive = false;
    musicT = 4 + Math.random() * 4;
  };

  SND.pianoActive = function () { return pianoActive; };

  SND.pianoPlinks = guard(function () {
    const count = 2 + (Math.random() < 0.45 ? 1 : 0);
    const plinkScale = [659.25, 698.46, 783.99, 880.00, 1046.50];
    let delay = 0;
    for (let i = 0; i < count; i++) {
      pianoNote(plinkScale[(Math.random() * plinkScale.length) | 0], 0.78, delay);
      delay += 0.09 + Math.random() * 0.11;
    }
  });

  const PAD_CHORDS = [
    [261.63, 329.63, 392.00], // C–E–G
    [220.00, 261.63, 329.63], // A–C–E
    [196.00, 293.66, 440.00], // G–D–A
    [293.66, 440.00, 329.63]  // D–A–E
  ];

  function playNightChord() {
    const t = ctx.currentTime;
    const attack = 2 + Math.random() * 1.5;
    const hold = 4 + Math.random() * 3;
    const release = 4 + Math.random() * 1.5;
    const dur = attack + hold + release;
    const chord = PAD_CHORDS[Math.random() < 0.72
      ? (Math.random() < 0.62 ? 0 : 1)
      : 2 + ((Math.random() * 2) | 0)];
    const lp = filt('lowpass', 900);
    const g = gainNode(0);
    lp.connect(g); g.connect(nightGain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.0042, t + attack);
    g.gain.setValueAtTime(0.0042, t + attack + hold);
    g.gain.linearRampToValueAtTime(0, t + dur);
    chord.forEach(function (f) {
      const tri = ctx.createOscillator();
      tri.type = 'triangle'; tri.frequency.value = f; tri.detune.value = -4;
      tri.connect(lp); tri.start(t); tri.stop(t + dur + 0.05);
      const sine = ctx.createOscillator();
      sine.type = 'sine'; sine.frequency.value = f; sine.detune.value = 4;
      sine.connect(lp); sine.start(t); sine.stop(t + dur + 0.05);
    });
    return dur + 2 + Math.random() * 3;
  }

  /* ---------- per-frame scheduling ---------- */

  let crackleT = 0.3;
  let tapT = 1;
  let swellT = 5;
  let padT = 3;
  let wasNight = false;

  SND.update = function (dt, world) {
    if (!ctx) return;

    // Rain is heard only as droplets ticking on the window glass — denser
    // when it pours. A tap is sometimes followed almost immediately by
    // another, so drops spatter in little wind-thrown clusters instead of a
    // steady metronome. Normal rain deliberately has no continuous wash;
    // the darker bed below belongs only to the storm state.
    const rainLvl = S.rain && !S.muted ? world.rain : 0;
    if (rainLvl > 0.03) {
      tapT -= dt;
      if (tapT <= 0) {
        playWindowTap();
        tapT = Math.random() < 0.25
          ? 0.03 + Math.random() * 0.07
          : (0.05 + Math.random() * 0.5) / (0.2 + rainLvl * 1.4);
      }
    }

    // Normal rain is taps-only. The dark continuous bed belongs exclusively
    // to the rare storm state and takes about four seconds to breathe in/out.
    const stormLvl = rainLvl * (world.storm ? 1 : 0);
    stormGain.gain.setTargetAtTime(stormLvl * 0.022, ctx.currentTime, 1.3);
    stormSwell1.gain.setTargetAtTime(stormLvl * 0.004, ctx.currentTime, 1.3);
    stormSwell2.gain.setTargetAtTime(stormLvl * 0.003, ctx.currentTime, 1.3);
    swellT -= dt;
    if (swellT <= 0) {
      swellT = 7 + Math.random() * 12;
      stormLfo1.frequency.setTargetAtTime(0.045 + Math.random() * 0.055, ctx.currentTime, 3);
      stormLfo2.frequency.setTargetAtTime(0.095 + Math.random() * 0.06, ctx.currentTime, 3);
    }

    // Fire crackles are the fireplace's whole voice now (no constant rumble):
    // paced and gained by the live burn, so a blaze snaps busily and embers
    // only tick now and then.
    if (S.fire && !S.muted) {
      const fl = world.fire ? world.fire.level : 1;
      crackleT -= dt;
      if (crackleT <= 0) {
        crackleT = (0.08 + Math.random() * 0.5) / (0.3 + fl);
        if (Math.random() < 0.32 + fl * 0.45) playCrackle(fl);
      }
    }

    // sparse music box
    if (S.music && !S.muted && !pianoActive) {
      musicT -= dt;
      if (musicT <= 0) {
        const night = world.daylight < 0.35;
        musicT = (1.7 + Math.random() * 3.6) * (night ? 1.7 : 1);
        if (Math.random() < 0.82) {
          noteIdx += [ -2, -1, -1, 1, 1, 2 ][Math.floor(Math.random() * 6)];
          noteIdx = Math.max(0, Math.min(SCALE.length - 1, noteIdx));
          playNote(SCALE[noteIdx], 0.035);
          if (Math.random() < 0.28) {
            const other = Math.min(SCALE.length - 1, noteIdx + 2);
            playNote(SCALE[other], 0.02);
          }
        }
      }
    }

    // Corner-piano ostinato + drift. The left hand rocks steadily while the
    // right hand wanders more sparsely; Nora leaves a little more air.
    if (S.music && !S.muted && pianoActive) {
      pianoChordT -= dt;
      if (pianoChordT <= 0) {
        const choices = PIANO_NEXT[pianoChord];
        pianoChord = choices[(Math.random() * choices.length) | 0];
        pianoChordT = 8 + Math.random() * 8;
        pianoFigure = (Math.random() * PIANO_FIGURES.length) | 0;
      }
      pianoLeftT -= dt;
      if (pianoLeftT <= 0) {
        const fig = PIANO_FIGURES[pianoFigure];
        pianoNote(PIANO_CHORDS[pianoChord][fig[pianoFigureStep]], 0.58);
        pianoFigureStep = (pianoFigureStep + 1) % fig.length;
        pianoLeftT = 0.9 + Math.random() * 0.5 + (Math.random() - 0.5) * 0.08;
      }
      pianoRightT -= dt;
      if (pianoRightT <= 0) {
        const nora = pianoStyle === 'nora';
        pianoRightT = (nora ? 2.1 : 1.2) + Math.random() * (nora ? 3.4 : 2.8);
        if (Math.random() >= (nora ? 0.38 : 0.25)) {
          pianoRightIdx += [-2, -1, -1, 1, 1, 2][(Math.random() * 6) | 0];
          pianoRightIdx = Math.max(0, Math.min(SCALE.length - 1, pianoRightIdx));
          pianoNote(SCALE[pianoRightIdx] / 2, 0.78);
          if (Math.random() < 0.18) {
            pianoNote(SCALE[Math.min(SCALE.length - 1, pianoRightIdx + 2)] / 2, 0.46, 0.035);
          }
        }
      }
    }

    // A low pentatonic pad fades in only at night. The music bus toggle owns
    // both this layer and the box, so no extra control is needed.
    const night = world.daylight < 0.35;
    nightGain.gain.setTargetAtTime(night ? 1 : 0, ctx.currentTime, 1.7);
    if (night && !wasNight) padT = 2 + Math.random() * 3;
    wasNight = night;
    if (night && S.music && !S.muted) {
      padT -= dt;
      if (padT <= 0) padT = playNightChord();
    }
  };
})();
