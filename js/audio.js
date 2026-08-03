/* Café Hygge — procedural sound engine (Web Audio, no samples) */
(function () {
  'use strict';

  const SND = (window.SND = {});

  let ctx = null;
  let master, sfx, amb, musicBus, fireBus, delaySend;
  let noiseBuf = null;
  let rainGain = null;
  let rainLfo1, rainLfo2, rainSwell1, rainSwell2;

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
    startRainLoop();
    startFireRumble();
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

  function startRainLoop() {
    const src = noiseSrc(true);
    const hp = filt('highpass', 550);
    const lp = filt('lowpass', 5200);
    rainGain = gainNode(0);
    src.connect(hp); hp.connect(lp); lp.connect(rainGain); rainGain.connect(amb);
    src.start();
    /* Slow swell so the rain "breathes". Two detuned LFOs at incommensurate
       rates drift in and out of phase, so the swell never settles into a
       rhythm; their frequencies also wander (see SND.update). Depth gains
       start at 0 and are scaled by the live rain level each update — the
       breathing dies out completely when the rain does. */
    rainLfo1 = ctx.createOscillator();
    rainLfo1.frequency.value = 0.07;
    rainSwell1 = gainNode(0);
    rainLfo1.connect(rainSwell1); rainSwell1.connect(rainGain.gain);
    rainLfo1.start();
    rainLfo2 = ctx.createOscillator();
    rainLfo2.frequency.value = 0.121;
    rainSwell2 = gainNode(0);
    rainLfo2.connect(rainSwell2); rainSwell2.connect(rainGain.gain);
    rainLfo2.start();
  }

  function startFireRumble() {
    const src = noiseSrc(true);
    const lp = filt('lowpass', 240);
    const g = gainNode(0.05);
    src.connect(lp); lp.connect(g); g.connect(fireBus);
    src.start();
  }

  function playCrackle() {
    const t = ctx.currentTime;
    const src = noiseSrc(false);
    const bp = filt('bandpass', 700 + Math.random() * 2800, 2.2);
    const g = gainNode(0);
    src.connect(bp); bp.connect(g); g.connect(fireBus);
    const peak = 0.02 + Math.random() * 0.08;
    const dur = 0.015 + Math.random() * 0.05;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
    src.start(t, Math.random() * 1.5, dur + 0.05);
    if (Math.random() < 0.06) { // occasional deep pop
      const o = ctx.createOscillator();
      o.frequency.value = 70 + Math.random() * 40;
      const og = gainNode(0);
      o.connect(og); og.connect(fireBus);
      og.gain.setValueAtTime(0.09, t);
      og.gain.exponentialRampToValueAtTime(0.0005, t + 0.09);
      o.start(t); o.stop(t + 0.1);
    }
  }

  /* ---------- one-shot helpers ---------- */

  function tone(freq, opts) {
    // opts: {type, gain, dur, attack, dest, sweepTo, sweepDur, send}
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.sweepTo) o.frequency.exponentialRampToValueAtTime(opts.sweepTo, t + (opts.sweepDur || opts.dur));
    const g = gainNode(0);
    o.connect(g);
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
    // filtered noise burst. opts: {dur, gain, attack, release, hp, lp, bp, q, dest, sweep:[from,to,onWhat]}
    const t = ctx.currentTime;
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

  SND.cupDown = guard(function () {
    tone(260, { gain: 0.035, dur: 0.05 });
    SND.clink(0.62, 0.04);
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

  /* ---------- music box ---------- */

  const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66]; // C major pentatonic-ish, two octaves reach
  let noteIdx = 2;
  let musicT = 4;

  function playNote(f, vel) {
    tone(f, { gain: vel, dur: 1.7, type: 'triangle', dest: musicBus, send: 0.7, attack: 0.006 });
    tone(f * 2, { gain: vel * 0.25, dur: 1.1, dest: musicBus });
  }

  /* ---------- per-frame scheduling ---------- */

  let crackleT = 0.3;
  let swellT = 5;

  SND.update = function (dt, world) {
    if (!ctx) return;

    // rain follows the weather outside; the swell depth follows the rain
    const rainLvl = S.rain && !S.muted ? world.rain : 0;
    rainGain.gain.setTargetAtTime(rainLvl * 0.11, ctx.currentTime, 0.8);
    rainSwell1.gain.setTargetAtTime(rainLvl * 0.011, ctx.currentTime, 0.8);
    rainSwell2.gain.setTargetAtTime(rainLvl * 0.007, ctx.currentTime, 0.8);
    // let the swell rates wander so the breathing never turns rhythmic
    swellT -= dt;
    if (swellT <= 0) {
      swellT = 7 + Math.random() * 12;
      rainLfo1.frequency.setTargetAtTime(0.045 + Math.random() * 0.055, ctx.currentTime, 3);
      rainLfo2.frequency.setTargetAtTime(0.095 + Math.random() * 0.06, ctx.currentTime, 3);
    }

    // fire crackles
    if (S.fire && !S.muted) {
      crackleT -= dt;
      if (crackleT <= 0) {
        crackleT = 0.05 + Math.random() * 0.4;
        if (Math.random() < 0.72) playCrackle();
      }
    }

    // sparse music box
    if (S.music && !S.muted) {
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
  };
})();
