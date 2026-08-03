# Sounds

Every sound in Café Hygge is synthesized live in `js/audio.js` with the Web
Audio API — there are currently **no audio files**. This doc catalogs the
signal chains so they can be tuned, replaced with real recordings (see
[roadmap.md](roadmap.md)), or extended in the same voice.

## Mixing philosophy

This app plays beside someone reading a real book. Rules:

- **Quiet by default.** One-shot peaks sit between 0.016 and 0.09 gain;
  ambience loops around 0.03–0.11. If a new sound feels satisfying at demo
  volume, it is probably too loud in situ.
- **Silence is content.** Sparse scheduling (music every 1.7–5.3 s, crackles
  in clusters, murmurs occasionally) matters more than the timbres.
- **Soft attacks almost everywhere**; the only sharp transients are tiny
  (clinks, crackle pops).
- Everything runs through a master **compressor** (threshold −20 dB, ratio 5)
  as a safety limiter.

## Bus graph

```
one-shots ─────────► sfx ───┐
rain loop ─────────► amb ───┤
rumble + crackles ─► fire ──┼─► master ─► compressor ─► speakers
music box ─────────► music ─┤
      └─ send ─► delay "room" (0.31 s, feedback 0.34, damped 1700 Hz, wet 0.2) ─┘
```

`fire` and `music` bus gains are the 🔥/🎵 toggles (smoothly ramped). Master
gain is the volume slider / mute. Bell-like sounds (door bell, ding, clinks,
music notes) take the delay send — it makes the room sound like a room.

## Ambience loops

| Sound | Recipe |
| --- | --- |
| **Rain** | White-noise loop → highpass 550 → lowpass 5200 → gain. Target gain = `world.rain × 0.11`, eased (τ 0.8 s). Two detuned LFOs (~0.045–0.10 Hz and ~0.095–0.155 Hz, rates re-randomized every 7–19 s) add a combined ±`rain × 0.018` swell so the rain "breathes" irregularly — depth scales with the rain level, so no swell remains when the rain stops. |
| **Fire rumble** | Noise loop → lowpass 240 → gain 0.05 on the fire bus. |
| **Fire crackles** | Scheduled every 50–450 ms (72% fire): noise burst → bandpass 700–3500 Hz (Q 2.2) → 15–65 ms exponential decay, peak 0.02–0.10. 6% chance of a deep pop (70–110 Hz sine, 90 ms). |

## The music box

C-major pentatonic-ish scale `[C5 D5 E5 G5 A5 C6 D6]`. A random walk
(±1/±2 steps) plays a note every 1.7–5.3 s (×1.7 sparser at night), 18% rests,
28% chance of a companion dyad two scale-steps up. Voice: triangle osc + quiet
octave sine, 1.7 s exponential decay, heavy delay send. Peak 0.035.

## One-shot catalog

| Function | Triggered by | Recipe (abbreviated) |
| --- | --- | --- |
| `doorBell()` | patron entering/leaving | 3 staggered bell tones around 1244 Hz (±2% detune, ×1.335 second strike) + 2.76× partial, 1.1 s decay, big delay send |
| `doorClose()` | ~1.1 s after entry | 95→55 Hz sine thump + lowpassed noise tap |
| `clink(pitch, vol)` | cup pickups, plates, busing | 3 partials (f, 1.51f, 2.63f) of ~2350×pitch Hz, 45–90 ms decays |
| `cupDown()` | cup set on table/counter | 260 Hz tap + `clink(0.62)` |
| `ding()` | order ready at the pass | 1720 Hz bell + 2.7× partial, 0.75 s |
| `grinder(dur)` | espresso prep | sawtooth ~55–63 Hz → lowpass 320, 26 Hz AM wobble + noise bandpass 850; 1.5 s |
| `tamp()` | after grinding | 185 Hz knock + click |
| `espresso(dur)` | shot pulling | noise bandpass sweeping 1600→850 Hz, slow attack + 52 Hz pump hum; 2.4 s |
| `steamWand(dur)` | milk steaming | highpass-1900 noise with a randomized sputter envelope; 1.8 s |
| `kettlePour(dur)` | tea | noise bandpass sweeping up 700→2100 Hz (cup filling) + 3–4 bubble blips |
| `pageTurn()` | readers | 160 ms noise sweep 1100→2400 Hz, gain 0.028 |
| `sip()` | sip animation peak | 130 ms highpass-2800 noise, gain 0.016 (barely there — correct) |
| `swish()` | wiping/cleaning | 320 ms lowpass-950 noise bell curve |
| `murmur(pitch)` | chatting patrons | triangle osc walking around the patron's 125–235 Hz voice pitch, 5.5 Hz vibrato, lowpass 480 — speech-shaped, wordless |
| `meow()` | cat, rarely | sine sweep 620→890→520 Hz through bandpass 900 |
| `purr(dur)` | sleeping/petted cat | 24 Hz sawtooth → lowpass 95, slow swell, ~2–3 s |

All one-shots are wrapped in `guard()`: they silently no-op before
`SND.init()` or while muted, so callers never need to check.

## Adding a sound

1. Build it in `audio.js` with the `tone()` / `hiss()` helpers where possible.
2. Route: sfx for events, or its own bus if the user should be able to toggle it.
3. Start at half the gain you think it needs; listen with the volume at 50%
   next to an open book.
4. Wrap in `guard()`, document it here, and wire the trigger in the relevant `sim-*.js` file.
