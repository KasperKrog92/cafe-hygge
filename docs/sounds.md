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
one-shots ─────────────► sfx ───┐
window taps + storm ───► amb ───┤
crackles + log catch ──► fire ──┼─► master ─► compressor ─► speakers
music box + night pad ─► music ─┤
corner felt piano ─────► music ─┤
      └─ send ─► delay "room" (0.31 s, feedback 0.34, damped 1700 Hz, wet 0.2) ─┘
```

`fire` and `music` bus gains are the 🔥/🎵 toggles (smoothly ramped). Master
gain is the volume slider / mute. Bell-like sounds (door bell, ding, clinks,
music notes) take the delay send — it makes the room sound like a room.

## Ambience loops

| Sound | Recipe |
| --- | --- |
| **Rain (window taps)** | The entire voice of normal rain: individual droplets on the glass. 22–36 ms noise ticks → bandpass 2.3–4.6 kHz (Q 7), peak 0.008–0.022; 18% are fatter frame/sill drops (bandpass 0.8–1.3 kHz, Q 3.5, 50 ms, peak ≤0.018). Next tap in `(0.05–0.55 s) ÷ (0.2 + rain × 1.4)` — denser as it pours — but 25% of taps are followed by another within 30–100 ms, so drops spatter in little wind-thrown clusters instead of a metronome. Skipped entirely below `rain` 0.03. Normal rain deliberately has **no continuous wash**. |
| **Storm wash** | Storm-only looping noise → highpass 360 Hz → lowpass 2.3 kHz → lowpass 1.4 kHz → ambience bus. Base gain follows storm rain to 0.022; two wandering LFOs add at most 0.007, and all three gains ease over ~4 s. It is dark rain heard through glass, beneath the discrete taps. |
| **Fire crackles** | The hearth has **no constant rumble** — its whole voice is discrete crackles, paced and gained by the live burn `world.fire.level`. Each: noise burst → bandpass 700–3500 Hz (Q 2.2) → 15–65 ms exponential decay, peak `(0.008–0.038) × (0.5 + level·0.6)` — roughly half the old crackle, and quieter still at embers. Next crackle in `(0.08–0.58 s) ÷ (0.3 + level)`, played at `(0.32 + level·0.45)` odds: a blaze snaps busily, embers only tick now and then. `level·0.05` chance of a deep 70–110 Hz pop (rare at embers). A fresh log adds `fireCatch()` (one-shots). |

## The music box

C-major pentatonic-ish scale `[C5 D5 E5 G5 A5 C6 D6]`. A random walk
(±1/±2 steps) plays a note every 1.7–5.3 s (×1.7 sparser at night), 18% rests,
28% chance of a companion dyad two scale-steps up. Voice: triangle osc + quiet
octave sine, 1.7 s exponential decay, heavy delay send. Peak 0.035.

### Night layer

When `daylight < 0.35`, a second layer fades in over about five seconds on the
same music bus. It chooses C–E–G, A–C–E, G–D–A, or D–A–E from the music box's
pentatonic notes one octave lower. Each pitch is a triangle/sine pair detuned
±4 cents, summed through a 900 Hz lowpass. Chords attack for 2–3.5 s, hover for
4–7 s, release for 4–5.5 s, then leave 2–5 s of silence; the combined peak is
about 0.025. Dawn fades active voices without a click. The 🎵 toggle governs
both layers. There is no vinyl crackle—the fireplace already owns that texture.

## The corner piano

The piano is an occasional **ostinato + drift** layer on the existing music
bus. Its felt voice combines a triangle fundamental, quiet sine octave, and
faint 2.9× partial under a 1.9 kHz lowpass; the shared 6 ms attack and
1.6–2.4 s decay peak below 0.03 per note with moderate room send. A hand-written
root–fifth–tenth figure rocks every 0.9–1.4 s through a small C / Am / F-ish /
G-ish pentatonic-safe graph while a random-walk right hand answers every
1.2–4 s with 25% rests and rare dyads. Nora's version leaves still more air.

`SND.pianoStart(style)` / `pianoStop()` own the dt-driven session. While a
session is active the music box rests; stopping resets its timer to 4–8 s so
it returns gently. The compatible night pad continues underneath. The 🎵
toggle mutes all three layers without changing their visual behavior.

## One-shot catalog

| Function | Triggered by | Recipe (abbreviated) |
| --- | --- | --- |
| `doorBell()` | patron entering/leaving | 3 staggered bell tones around 1244 Hz (±2% detune, ×1.335 second strike) + 2.76× partial, 1.1 s decay, big delay send |
| `doorClose()` | ~1.1 s after entry | 95→55 Hz sine thump + lowpassed noise tap |
| `clink(pitch, vol)` | cup pickups, plates, busing, matcha-caddy scoop | 3 partials (f, 1.51f, 2.63f) of ~2350×pitch Hz, 45–90 ms decays |
| `chairScrape(long)` | ordinary chairs settling / patrons standing | 90–140 ms noise scrape around 380–650 Hz under a 900 Hz lowpass, soft 8 ms attack, peak 0.02–0.028; the 160 ms standing variant adds a half-gain scuff |
| `coins()` | about half of returned cups | 2–3 muffled inharmonic clinks around 2.9–4.2 kHz and 1.43×, loosely spaced 40–90 ms, combined peak ≤0.025, small room send |
| `cupDown()` | cup set on table/counter | 260 Hz tap + `clink(0.62)` |
| `umbrellaShake()` | rainy arrival at the door | 3–4 lowpassed noise flaps around 900 Hz, 60 ms each at loose ~90 ms spacing, peak 0.03 |
| `shoeWipe()` | wet arrival wiping shoes on the doormat | 2–3 dull noise scuffs around 300–450 Hz under a 640 Hz lowpass, 110–160 ms each at ~150–210 ms spacing (real foot passes), soft 12 ms attack, peak ≤0.02 |
| `keys()` | laptop typing bout | 2–4 jittered 18 ms bandpassed noise ticks around 2.1–3 kHz, peak 0.02 |
| `ding()` | order ready at the pass | 1720 Hz bell + 2.7× partial, 0.75 s |
| `grinder(dur)` | espresso prep | sawtooth ~55–63 Hz → lowpass 320, 26 Hz AM wobble + noise bandpass 850; 1.5 s |
| `tamp()` | after grinding | 185 Hz knock + click |
| `espresso(dur)` | shot pulling | noise bandpass sweeping 1600→850 Hz, slow attack + 52 Hz pump hum; 2.4 s |
| `steamWand(dur)` | milk steaming, including hot matcha | highpass-1900 noise with a randomized sputter envelope; 1.8 s |
| `kettlePour(dur)` | tea and matcha concentrate | noise bandpass sweeping up 700→2100 Hz (cup filling) + 3–4 bubble blips |
| `whisk(dur)` | both matcha preparations | hand-loose 14–24 ms noise ticks every 55–85 ms → bandpass 1.5–2.4 kHz (Q 2.5), per-tick peak 0.012–0.02 inside a 150 ms-in / 200 ms-out envelope, combined peak ≤0.028, no room send |
| `iceRattle()` | iced-matcha finish | 3–4 jittered glass partial stacks (f, 1.51f, 2.63f) around 2.6–3.4 kHz, 40–70 ms decays spaced 60–120 ms, combined peak ≤0.03 with a small 0.15 room send |
| `chalkTick()` | Nora chalking the menu | one 45–70 ms high, narrow filtered-noise scrape; called 2–3 times across the gesture, peak ~0.025 |
| `waterPour(dur)` | Nora watering a plant | dark bandpassed/lowpassed noise sweeping 520→980 Hz, 1.2 s, peak 0.03 |
| `matchStrike()` | first stop of Nora's candle round | 100 ms scratch around 1.8 kHz followed by a 200 ms high fizz, combined peak ~0.03 |
| `candlePop()` | each candle stop | soft 90 ms airy filtered-noise fwip, peak 0.018 |
| `fireCatch()` | a fresh log laid on the fire (Nora or a fireside regular) | an 84→54 Hz settle thump + a soft low whoomph (lowpass-440 noise swelling to 0.05 over 0.2 s, ~1.1 s tail) + 5 fresh crackles scattered over ~0.7 s; on the fire bus |
| `pageTurn()` | readers | 160 ms noise sweep 1100→2400 Hz, gain 0.028 |
| `needle()` | Gerda knitting (scarf arc) | soft wooden tick: 540–650 Hz tone under a 2.6 kHz lowpass (peak 0.013) + a fainter harmonic, with a half-chance second tap — quieter than the fire, on purpose |
| `sip()` | sip animation peak | 130 ms highpass-2800 noise, gain 0.016 (barely there — correct) |
| `swish()` | wiping/cleaning | 320 ms lowpass-950 noise bell curve |
| `murmur(pitch)` | chatting patrons | triangle osc walking around the patron's 125–235 Hz voice pitch, 5.5 Hz vibrato, lowpass 480 — speech-shaped, wordless |
| `meow()` | cat, rarely | sine sweep 620→890→520 Hz through bandpass 900 |
| `purr(dur)` | sleeping/petted cat | 24 Hz sawtooth → lowpass 95, slow swell, ~2–3 s |
| `crunch()` | cat eating kibble | 3–5 jittered 30 ms noise grains around bandpass 1.05–1.4 kHz, peak 0.02 |
| `lapWater()` | cat drinking (~4/s) | tiny 330–410→250 Hz sine blip plus filtered noise, combined peak below 0.015 |
| `kibblePour(dur)` | Nora refilling food | 10 granular noise bursts spread across ~0.9 s, bandpass jitter below a 3 kHz lowpass, density/gain decays from peak 0.035 |
| `softThump()` | cat's final hop-down landing | 90→58 Hz sine thud plus a damped lowpassed click, peak 0.03 |
| `pianoPlinks()` | cat stepping from the keyboard to the piano lid | 2–3 upper-register felt-piano notes 90–200 ms apart, including one allowable off-scale neighbour; each remains below 0.025 on the music bus |
| `churchBells()` | noon hour edge | four human-loose strikes 1.7–2.1 s apart: ~330 Hz plus quiet 1.2× tierce and 2× partial, lowpass 1.2 kHz, 2.5–3.5 s decay, generous room send, peak below 0.02 |
| `mantelChime()` | 09:00, 15:00, 18:00, 21:00 | soft 740→620 Hz triangle “ding… dong” 0.45 s apart with quiet octave partials, ~1.2 s decay, moderate room send, combined peak ~0.018 |
| `kettleWhistle()` | once daily between 19:00 and 21:30 | distant 1.6 kHz sine bending gently upward with 5 Hz wobble under a 1 kHz lowpass; 1.2 s attack, quiet hold, then a downward lift-off chirp, peak 0.018 |
| `thunder()` | 1–4 s after a storm flash, every 25–75 s | 2.8–5 s looping-noise rumble through a 140→70 Hz lowpass and a multi-swell envelope, with a quiet 45–60 Hz sine beneath; ambience peak ~0.044, no room send |

All one-shots are wrapped in `guard()`: they silently no-op before
`SND.init()` or while muted, so callers never need to check.

## Adding a sound

1. Build it in `audio.js` with the `tone()` / `hiss()` helpers where possible.
2. Route: sfx for events, or its own bus if the user should be able to toggle it.
3. Start at half the gain you think it needs; listen with the volume at 50%
   next to an open book.
4. Wrap in `guard()`, document it here, and wire the trigger in the relevant `sim-*.js` file.
