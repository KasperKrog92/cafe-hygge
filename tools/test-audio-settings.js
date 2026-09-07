/* Audio preferences and routing without speakers or browser storage. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/audio.js'), 'utf8');
function boot(saved) {
  const nodes = [], writes = [];
  function param() { return { value: 0, setTargetAtTime(v) { this.value = v; },
    setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setValueCurveAtTime() {} }; }
  function node(kind) {
    const n = { kind, outputs: [], stops:0, connect(to) { assert.ok(to); this.outputs.push(to); }, start() {}, stop() {this.stops++;} };
    ['gain','frequency','Q','delayTime','threshold','knee','ratio','attack','release'].forEach(k => n[k] = param());
    nodes.push(n); return n;
  }
  class AudioContext {
    constructor() { this.destination = node('speakers'); this.currentTime = 0; this.sampleRate = 100; }
    createGain() { return node('gain'); }
    createDynamicsCompressor() { return node('compressor'); }
    createDelay() { return node('delay'); }
    createBiquadFilter() { return node('filter'); }
    createOscillator() { return node('oscillator'); }
    createBufferSource() { return node('source'); }
    createBuffer(ch, len) { return { getChannelData() { return new Float32Array(len); } }; }
  }
  const window = { AudioContext };
  vm.runInNewContext(source, { window, localStorage: { getItem() { return saved; }, setItem(k,v) { writes.push(JSON.parse(v)); } }, setTimeout() {} });
  return { sound: window.SND, nodes, writes };
}
const old = boot(JSON.stringify({ volume: .35, muted: true, rain: false, fire: false, music: false }));
assert.equal(old.sound.settings.volume, .35);
assert.equal(old.sound.settings.rain, false);
assert.equal(old.sound.settings.cafeVolume, 1);
old.sound.resetSettings();
assert.equal(old.sound.settings.rain, false, 'Sound defaults preserve clear-weather preference');
for (const saved of ['null', '[]', '{', '{"volume":"loud","music":0}']) {
  assert.equal(boot(saved).sound.settings.volume, .7);
}
assert.equal(boot('{"rainVolume":-3,"musicVolume":8}').sound.settings.rainVolume, 0);
assert.equal(boot('{"rainVolume":-3,"musicVolume":8}').sound.settings.musicVolume, 1);
const { sound, nodes, writes } = boot('{}');
sound.init();
const master = nodes.find(n => n.kind === 'gain');
const buses = nodes.filter(n => n.outputs.includes(master));
assert.equal(buses.length, 5, 'Only the five channel faders may feed master; no echo bypass');
Object.assign(sound.settings, { cafeVolume: .2, dialogueVolume:.6, rainVolume: .3, fireVolume: .4, musicVolume: .5 });
sound.applyToggles();
assert.deepEqual(buses.map(b => b.gain.value), [.2, .6, .3, .4, .5]);
const music = buses[4];
function reaches(from, target, seen = new Set()) {
  if (from === target) return true;
  if (seen.has(from)) return false;
  seen.add(from); return from.outputs.some(n => reaches(n, target, seen));
}
assert.ok(reaches(music.roomSend, music), 'Music echoes return through music volume');
assert.ok(!reaches(music.roomSend, buses[0]), 'Music echoes cannot leak through cafe activity');
sound.settings.music = false; sound.applyToggles(); assert.equal(music.gain.value, 0);
sound.settings.muted = true; sound.applyVolume(); assert.equal(master.gain.value, 0);
sound.resetSettings();
assert.equal(master.gain.value, .7);
assert.deepEqual(buses.map(b => b.gain.value), [1, .7, 1, 1, 1]);
assert.equal(writes.at(-1).muted, false);
const count=()=>nodes.filter(n=>n.kind==='oscillator').length;
const beforeVoice=count();sound.dialogueSyllable(3);
assert.equal(count(),beforeVoice+1,'Speaking must create a voice');
const voice=nodes.filter(n=>n.kind==='oscillator').at(-1);
assert.ok(reaches(voice,buses[1]),'Speaking uses its independent dialogue fader');
sound.dialogueSyllable(6);assert.equal(count(),beforeVoice+1,'Catch-up syllables must not overlap');
const stops=voice.stops;sound.stopDialogue();assert.equal(voice.stops,stops+1,'Reveal/pause stops the voice');
sound.settings.instantText=true;sound.dialogueSyllable(9);assert.equal(count(),beforeVoice+1,'Instant text is silent');
sound.resetSettings();assert.equal(sound.settings.instantText,true,'Sound defaults preserve text preference');
console.log('Audio defaults, legacy preferences, malformed values, independent faders, echo routing and mute: PASS');
