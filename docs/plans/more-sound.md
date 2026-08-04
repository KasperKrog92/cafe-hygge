# Plan: more sound — small foley, town time, thunderstorms, a night layer

Executes the roadmap's "More sound, still synthesized" section, pooled
into four independently shippable phases, plus the mantel-clock chime
pulled in from "More world" (the clock art already exists and keeps
in-world time — `drawClockHands` in `js/scene-bg.js` — so the chime is
purely a sound feature and belongs with the other time-of-day sounds).

**Design bar check:** every sound here is something the room would make
anyway — furniture, weather, a clock, a kettle someone forgot. Nothing
asks for attention: no new UI, no new toggles (the storm rides the
existing 🌧️ toggle, the night layer rides 🎵), and everything obeys the
house gain discipline (one-shots 0.016–0.09 peak, ambience ≤ ~0.05,
through the compressor). The loudest new voice — thunder — is
deliberately the rarest.

**Shape:** four phases, each shippable alone and in any order, each
ending the standard way — smoke test, `?dev` + `__dev.audit()` → 0
problems, listen at 50% volume next to an open book, and sounds.md /
world.md / AGENTS.md updated in the same change. Suggested order is as
listed (rising complexity), but Phase 3 (thunderstorms) is the
owner-requested headliner and can jump the queue.

---

## Current state (what we build on)

- **Audio engine** (`js/audio.js`): buses `sfx`, `amb`, `fireBus`,
  `musicBus`, `delaySend` (the "room"); helpers `tone(freq, opts)`,
  `hiss(opts)`, `filt`, `gainNode`; every one-shot wrapped in `guard()`
  so callers never check init/mute. Per-frame scheduling lives in
  `SND.update(dt, world)` — dt-driven, so it keeps ticking in hidden
  tabs (the 250 ms interval in main.js).
- **Weather** (`updateWeather`, `js/sim-core.js`): `world.rainTarget`
  re-rolls every 150–420 s from {0 clear 34%, 0.4 drizzle 34%, 0.8 rain
  32%}; `world.rain` eases toward it at 0.18/s. The 🌧️ toggle forces
  the *weather* clear, not just the audio — rain you hear must be rain
  on the glass. Normal rain's entire voice is discrete window taps; the
  continuous hissing wash was deliberately retired and reserved for a
  storm state. **The retired wash recipe is at
  `git show ba53bb3^:js/audio.js`** (noise loop → highpass → cascaded
  lowpasses → `rainGain` on the amb bus, two incommensurate LFOs at
  ~0.07 Hz making it breathe).
- **Clock** (`updateClock`, `js/sim-core.js`): `world.hour` from
  `world.t`; **one in-world hour = 60 real seconds** (24-minute day,
  boot at 08:24). `dayIndex(world)` already exists for once-per-day
  logic (the candle ritual and Holger use it). Lamp-threshold captions
  in `updateClock` are the template for hour-edge events.
- **Trigger sites on hand** (`js/sim-patrons.js`): patrons flip
  `p.pose` to `'sit'` when `walker()` completes in the `toSeat` and
  `backToSeat` states; back to `'stand'` in `beginDeparture` and the
  book-fetch departure. The cup return happens in the `return` state
  (already plays `SND.clink(0.7, 0.04)` and sometimes captions
  "returns the cup — tak!").
- **Music box**: C-major pentatonic `[C5 D5 E5 G5 A5 C6 D6]`, a note
  every 1.7–5.3 s (×1.7 sparser at night, `world.daylight < 0.35`),
  peak 0.035 on `musicBus`.
- **Lighting/flash plumbing**: scene-bg's per-frame wall pass already
  reads `world` (clock hands, window, flames); scene-fx's
  `drawLighting` scales pools by `pal.lamp` / darkness. A storm flash
  is one more world-driven read, same pattern.

---

## Phase 1 — small foley: chair scrapes and tip-jar coins

The cheapest phase: two new one-shots on transitions that already
exist. No sim state, no scheduling.

### `SND.chairScrape(long)`

- Recipe: one lowpassed noise scrape — `hiss` ~90–140 ms, bandpass
  380–650 Hz (Q ~1.6) under a ~900 Hz lowpass, soft attack (8 ms),
  peak **0.02–0.028**. `long` variant (standing up) ~160 ms with a tiny
  second scuff 60 ms later at half gain. No delay send — it's floor,
  not bell.
- Triggers (`js/sim-patrons.js`): on the `toSeat` / `backToSeat`
  settle (`p.pose = 'sit'`) and in `beginDeparture` (`p.pose =
  'stand'`). Gate at ~0.8 so it never turns metronomic when a couple
  sits together; **skip for window-sill perches and the armchair**
  (cushions don't scrape — check `p.seat.window || p.seat.armchair`).
- No caption — it's texture, not an event.

### `SND.coins()`

- Recipe: 2–3 tiny inharmonic clinks in a jar — `tone` partials around
  2.9–4.2 kHz (f, ~1.43f) with 35–60 ms decays, jittered 40–90 ms
  apart, slight lowpass so they read muffled-in-glass, combined peak
  **≤ 0.025**, small delay send (0.15) — coins are the one foley here
  allowed a hint of room.
- Trigger: the `return` state in `js/sim-patrons.js`, next to the
  existing clink, gated ~0.5 — not every patron tips. When it fires and
  the caption gate also wins, prefer a dedicated line: `'a coin in the
  tip jar — tak!'` (replaces, not stacks with, the cup-return line).
- Optional art (owner's call, separate commit is fine): a ~6 px jar on
  the counter near the register end. Sound ships without it — an
  unseen jar behind the pastry case is perfectly believable.

**Verify:** `__dev.spawn()` + `__dev.ff()` a full visit; sit/stand and
return moments sound once each, quiet; console clean; `__dev.audit()`
→ 0. **Docs:** two rows in sounds.md's one-shot catalog.

---

## Phase 2 — the town keeps time: church bells, mantel chime, evening kettle

Three sounds that all hang off the clock, sharing one bit of
groundwork.

### Groundwork: hour edges and daily slots (`updateClock`, `js/sim-core.js`)

- Track `world.lastWholeHour = Math.floor(world.hour)`; on change, fire
  an hour-edge hook. **If the jump is more than ~1.5 h (a `__dev.hour`
  jump or `?hour=` boot), resync silently without firing** — jumping to
  20:00 must not ring noon's bells.
- Daily slots reuse the `dayIndex(world)` pattern: roll a target hour
  once per day, fire when `world.hour` crosses it, remember the day it
  fired.

### Church bells at noon — `SND.churchBells()`

- Recipe: 4 faint strikes ~1.7–2.1 s apart. Each strike: bell partials
  with the church-bell minor third — f ≈ 330 Hz, plus ~1.2f (tierce)
  and 2f at lower gain — through a ~1.2 kHz lowpass (across the
  street, through glass), 2.5–3.5 s decays, per-strike peak **≤ 0.02**,
  generous delay send. Slight ±1% detune per strike so they feel swung
  by a person.
- Trigger: hour edge == 12. Caption, gated ~0.5:
  `'noon — the church bells, from across the street.'`
- Optional Danish flavor (owner's call, default off): a shorter evening
  ring at 18:00 (aftenringning), two strikes.

### Mantel clock chime — `SND.mantelChime()`

- **The math that shapes this:** on the hour every hour = every 60 real
  seconds — a metronome, not a clock, and it would fight the music
  box. So the mantel clock speaks only at a few chosen hours:
  **9, 15, 18, and 21** (noon belongs to the church; the small hours
  belong to the dozers). That's one chime every 3+ real minutes at
  most.
- Recipe: a single soft descending two-note "ding… dong" (~740 then
  ~620 Hz, triangle + quiet sine octave, 1.2 s decays, 0.45 s apart),
  peak **0.018**, moderate delay send. Duller and rounder than the
  doorbell — wood case, not brass shopfront.
- No caption — the clock face already shows the time; the sound is the
  glance made audible.

### Evening kettle — `SND.kettleWhistle()`

- Recipe: distant and muffled — a sine around 1.6 kHz with a slow
  upward bend (+60 cents over 2 s) and a gentle 5 Hz wobble, under a
  ~1 kHz lowpass (it's in the back room, two doors away), attack ~1.2 s,
  holds ~2.5 s, then cut with a tiny downward chirp as someone lifts it
  off the heat. Peak **0.018**. No delay send — wrong room.
- Trigger: daily slot rolled in 19:00–21:30. Caption, gated ~0.6:
  `'a kettle sings, somewhere in the back.'`
- Deliberately unexplained — nobody on screen reacts. The café has a
  back room; that's the whole story.

### Dev support

- `__dev.kettle()` re-arms today's kettle slot to fire within the next
  in-world quarter hour. Bells and chime need no helper —
  `__dev.hour(11.98)` and a few seconds' wait covers them. Document in
  AGENTS.md's console list.

**Verify:** `__dev.hour(11.97)` → bells once; `__dev.hour(8.97)` /
`14.97` / `17.97` / `20.97` → chime once each; `__dev.kettle()` →
whistle + caption; `__dev.hour` big jumps ring nothing. `__dev.audit()`
→ 0. **Docs:** three sounds.md rows; world.md's events list gains the
time events; AGENTS.md dev list.

---

## Phase 3 — thunderstorms (owner-requested)

A rare storm state above heavy rain. Only during a storm does the rain
get a voice beyond the window taps.

### Sim: a fourth weather outcome (`updateWeather`, `js/sim-core.js`)

- Re-roll becomes: clear 34%, drizzle 34%, rain 24%, **storm 8%**
  (`rainTarget = 1.0`, `world.storm = true`). Storm ends when the next
  re-roll lands anywhere else. With 150–420 s periods, that's a storm
  every couple of in-world days — rare enough to be an event.
- **The 🌧️ toggle rules storms too:** `SND.settings.rain === false`
  already forces the effective target to 0; additionally clear
  `world.storm` so no wash, no thunder, no flash can occur — a flash
  without rain on the glass breaks the room (world.md's own rule).
- Transition captions: entering — `'the sky darkens; a storm settles
  over the street.'`; leaving falls through to the existing
  softening/letting-up lines.
- Thunder scheduling is **sim-side** (dt-driven in `updateWeather`, so
  flash and sound stay paired and hidden tabs keep ticking): while
  `world.storm && world.rain > 0.6`, roll the next strike in 25–75 s.
  Each strike: set `world.flash = 1`, then `SND.thunder()` after a
  1–4 s gap (store `world.thunderIn`; distance made audible — vary the
  gap with the rumble's depth if it's cheap to thread through).
- `world.flash` decays at ~4/s in the sim tick.

### Audio: the wash returns, plus thunder (`js/audio.js`)

- **Revive the wash** from `git show ba53bb3^:js/audio.js`: noise loop
  → highpass → cascaded lowpasses → gain on the `amb` bus, two
  incommensurate slow LFOs so it breathes. Changes from the retired
  version: it scales with **storminess, not rain** — ramp in only while
  `world.storm` (ease over ~4 s in `SND.update`), cap around **0.03**,
  and keep it darker than before (final lowpass ~1.4 kHz — through
  glass, and the taps still carry the detail on top). Normal rain
  stays taps-only by design; the wash felt like standing outside in it.
- Window taps during a storm come along free — density already scales
  with `world.rain`, and 1.0 pours harder than 0.8.
- **`SND.thunder()`**: 2.5–5 s of filtered-noise rumble — noise through
  a lowpass sweeping ~140 → 70 Hz, slow 0.4–0.8 s attack, an envelope
  of 2–3 overlapping swells so it rolls rather than booms, a quiet
  45–60 Hz sine under the loudest swell. Peak **0.04–0.05** (the
  ceiling of the house range — thunder is allowed to be the biggest
  thing you barely hear). Amb bus, no delay send (it *is* the room
  tone for a moment).

### Scene: the flash (`js/scene-bg.js`, `js/scene-fx.js`)

- Window glass pass brightens with `world.flash` — a brief cool lift on
  the panes (both windows and the door glass), alpha capped ~0.15.
- `drawLighting` adds one faint cool pool below each window scaled by
  `world.flash × darkness` — invisible at noon, a soft blink at night.
  Never a full-screen flash; the reader's eye should catch it the way
  you catch lightning from a couch: on the glass, not in the room.
- Optional (owner's call): storm dims `pal.daylight` a touch (×0.85)
  while active. Skippable — the palette invariants are load-bearing
  and the flash reads fine without it.

### Dev support

- `__dev.storm(on)` — force the weather walk into (or out of) the storm
  state now; next thunder roll within ~10 s so a session can hear one
  without waiting. Document in AGENTS.md.

**Verify:** `__dev.storm()` → wash fades in ≤ ~4 s, taps densify,
thunder within a minute, flash precedes rumble, all of it darker than
the fire; 🌧️ toggle mid-storm kills weather, wash, thunder, and flash
together; `__dev.storm(false)` → wash ramps out; `__dev.hour(20)` storm
at night for the flash check; hidden-tab soak (switch tabs a minute,
storm still audible, no burst on return). `__dev.audit()` → 0.
**Docs:** sounds.md (wash returns as a storm-only ambience row +
thunder row, with the "normal rain is taps-only" note updated),
world.md (weather walk percentages, storm state, flash, captions),
AGENTS.md dev list.

---

## Phase 4 — the lo-fi night layer

Soft generative chords under the music box, night only. The riskiest
phase for the cozy bar — music is the easiest thing to overdo — so it
ships last and leans conservative.

- **Voicing:** chords drawn strictly from the music box's own
  pentatonic set {C, D, E, G, A}, one octave *below* the box (around
  C4) so the two never collide registrally: C–E–G, A–C–E, G–D–A,
  D–A–E. Drift mostly I ⇄ vi with occasional G/D colors — a slow
  ramble, not a progression.
- **Voice:** 2–3 detuned triangle/sine pairs (±4 cents), attack 2–4 s,
  hold 4–8 s, release 4–6 s, under a ~900 Hz lowpass. Per-voice gain
  ~0.01, **combined ≤ 0.03**. A new chord every 12–24 s with real
  silences between — the box still leads; the pad is the room
  remembering the tune.
- **No vinyl crackle.** Lo-fi usually implies it, but the fireplace
  already owns crackle in this room; two crackle sources would smear
  both. The "lo-fi" here is the dullness and the detune, not noise.
- **Routing & gating:** `musicBus` (the 🎵 toggle governs both layers —
  no new UI). Scheduled in `SND.update` behind the same night check as
  the box's sparse mode (`world.daylight < 0.35`), with its own master
  gain eased over ~5 s so dusk fades it in and dawn fades it out
  mid-chord without a click.

**Verify:** `__dev.hour(22)` → pad present under the box, sitting
below it; `__dev.hour(12)` → gone within seconds, no click; 🎵 toggle
kills both; an evening's listen at 50% volume next to a book — if you
notice the pad arriving, it's too loud. `__dev.audit()` → 0.
**Docs:** sounds.md music section gains the night-layer subsection.

---

## Out of scope (stays on the roadmap)

The "further sound ideas" list on the roadmap — the street heard
through the open door, the spoon stir, the machine's idle sigh, the
creaky floorboard, radiator ticks, shelf-book foley — plus real sample
playback (its own roadmap section) and any patron/art features the
sounds above might tempt (a visible back room, a bell tower). Each can
graduate into a later plan once these four phases have settled in.
