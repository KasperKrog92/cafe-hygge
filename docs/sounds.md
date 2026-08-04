# Sounds

Every sound in Café Hygge is synthesized live in `js/audio.js` with the Web
Audio API — there are currently **no audio files**. This doc catalogs the
signal chains so they can be tuned, replaced with real recordings (see
[roadmap.md](roadmap.md)), or extended in the same voice.

## Mixing philosophy

This app plays beside someone reading a real book. Rules:

- **Quiet by default.** One-shot peaks sit between 0.016 and 0.09 gain;
  ambience stays at or below ~0.05. If a new sound feels satisfying at demo
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
window taps ───────► amb ───┤
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
| **Rain (window taps)** | The entire voice of normal rain: individual droplets on the glass. 22–36 ms noise ticks → bandpass 2.3–4.6 kHz (Q 7), peak 0.008–0.022; 18% are fatter frame/sill drops (bandpass 0.8–1.3 kHz, Q 3.5, 50 ms, peak ≤0.018). Next tap in `(0.05–0.55 s) ÷ (0.2 + rain × 1.4)` — denser as it pours — but 25% of taps are followed by another within 30–100 ms, so drops spatter in little wind-thrown clusters instead of a metronome. Skipped entirely below `rain` 0.03. There is deliberately **no continuous hissing wash** — that (plus thunder) is reserved for a future storm weather state (see [roadmap.md](roadmap.md)); the retired wash recipe is in git history. |
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
| `umbrellaShake()` | rainy arrival at the door | 3–4 lowpassed noise flaps around 900 Hz, 60 ms each at loose ~90 ms spacing, peak 0.03 |
| `keys()` | laptop typing bout | 2–4 jittered 18 ms bandpassed noise ticks around 2.1–3 kHz, peak 0.02 |
| `ding()` | order ready at the pass | 1720 Hz bell + 2.7× partial, 0.75 s |
| `grinder(dur)` | espresso prep | sawtooth ~55–63 Hz → lowpass 320, 26 Hz AM wobble + noise bandpass 850; 1.5 s |
| `tamp()` | after grinding | 185 Hz knock + click |
| `espresso(dur)` | shot pulling | noise bandpass sweeping 1600→850 Hz, slow attack + 52 Hz pump hum; 2.4 s |
| `steamWand(dur)` | milk steaming | highpass-1900 noise with a randomized sputter envelope; 1.8 s |
| `kettlePour(dur)` | tea | noise bandpass sweeping up 700→2100 Hz (cup filling) + 3–4 bubble blips |
| `chalkTick()` | Nora chalking the menu | one 45–70 ms high, narrow filtered-noise scrape; called 2–3 times across the gesture, peak ~0.025 |
| `waterPour(dur)` | Nora watering a plant | dark bandpassed/lowpassed noise sweeping 520→980 Hz, 1.2 s, peak 0.03 |
| `matchStrike()` | first stop of Nora's candle round | 100 ms scratch around 1.8 kHz followed by a 200 ms high fizz, combined peak ~0.03 |
| `candlePop()` | each candle stop | soft 90 ms airy filtered-noise fwip, peak 0.018 |
| `pageTurn()` | readers | 160 ms noise sweep 1100→2400 Hz, gain 0.028 |
| `sip()` | sip animation peak | 130 ms highpass-2800 noise, gain 0.016 (barely there — correct) |
| `swish()` | wiping/cleaning | 320 ms lowpass-950 noise bell curve |
| `murmur(pitch)` | chatting patrons | triangle osc walking around the patron's 125–235 Hz voice pitch, 5.5 Hz vibrato, lowpass 480 — speech-shaped, wordless |
| `meow()` | cat, rarely | sine sweep 620→890→520 Hz through bandpass 900 |
| `purr(dur)` | sleeping/petted cat | 24 Hz sawtooth → lowpass 95, slow swell, ~2–3 s |
| `crunch()` | cat eating kibble | 3–5 jittered 30 ms noise grains around bandpass 1.05–1.4 kHz, peak 0.02 |
| `lapWater()` | cat drinking (~4/s) | tiny 330–410→250 Hz sine blip plus filtered noise, combined peak below 0.015 |
| `kibblePour(dur)` | Nora refilling food | 10 granular noise bursts spread across ~0.9 s, bandpass jitter below a 3 kHz lowpass, density/gain decays from peak 0.035 |
| `softThump()` | cat's final hop-down landing | 90→58 Hz sine thud plus a damped lowpassed click, peak 0.03 |

All one-shots are wrapped in `guard()`: they silently no-op before
`SND.init()` or while muted, so callers never need to check.

## Adding a sound

1. Build it in `audio.js` with the `tone()` / `hiss()` helpers where possible.
2. Route: sfx for events, or its own bus if the user should be able to toggle it.
3. Start at half the gain you think it needs; listen with the volume at 50%
   next to an open book.
4. Wrap in `guard()`, document it here, and wire the trigger in the relevant `sim-*.js` file.
