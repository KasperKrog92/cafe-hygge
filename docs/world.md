# World systems — time, weather, light, events

The systems that make the room feel alive independent of any character.
All in the `js/sim-*.js` files (state) and the `js/scene-*.js` renderer files (appearance).

## Time

- One in-world day = **1440 real seconds (24 minutes)**; the sim boots at
  08:24 so a fresh visit opens onto morning light.
- `world.hour` (0–24 float) drives everything: the sky, the lighting, the
  mantel clock's hands, spawn rates, music sparseness.
- The palette comes from `SCENE.dayPalette(hour)`, interpolating these
  keyframes (`DAYKEYS` in `scene-core.js`):

| Hour | Sky | daylight | lamp |
| --- | --- | --- | --- |
| 0.0–4.5 | deep night blues | 0.00 | 1.00 |
| 6.5 | dawn peach/amber | 0.50 | 0.50 |
| 9–16.5 | clear day blue | 1.00 | 0.00 |
| 18.5 | dusk orange | 0.55 | 0.45 |
| 20.5 | late blue-violet | 0.12 | 0.90 |
| 22–24 | deep night | 0.00 | 1.00 |

- `daylight` scales the multiply-tint over the whole scene and patron spawn
  rates; `lamp` scales every warm glow (hanging lamps, the two nook reading
  lamps, candles, town windows) and the star/moon alpha.
- Threshold captions: lamps crossing on → "The streetlamps flicker on, one by
  one."; off → "Morning light spills across the floorboards."

## Weather

- `world.rainTarget` re-rolls every 150–420 s: clear (34%), drizzle 0.4 (34%),
  rain 0.8 (32%). `world.rain` eases toward it at 0.18/s.
- Rain drives: streak count/alpha on the window glass, the rain-loop gain in
  the audio engine, and flavor in captions ("Freja ducks in out of the rain.").
- The 🌧️ toggle doesn't just mute rain audio — it forces the *weather* clear,
  because hearing rain that isn't on the glass (or vice versa) breaks the room.
- Transition captions fire only on meaningful changes: rain starting, easing
  to drizzle, or stopping.

## Lighting (the pass that sells the coziness)

Applied after all sprites, in `SCENE.drawLighting`:

1. **Multiply tint** over the full canvas: night `rgb(112,120,172)` →
   day `rgb(255,250,242)`, lerped by `daylight`.
2. **Additive glows** (`lighter` composite): the three hanging lamps (the
   third hangs over the counter, with two spill pools across the back bar —
   machine + pass, pastry case — so the counter stays warm after dark), the
   two reading lamps in the nook, mantel candles (all scaled by `lamp`); the
   fireplace (always on,
   flickering via layered sines); a candle jar on every dining table (always
   lit, stronger after dark, per-table flicker — the window poseur tables
   carry no candle, cups only); a soft daylight pool below each of the two
   windows.
3. **Vignette**: radial darkening toward the edges, always.

Speech bubbles and captions draw **after** this pass so they stay readable at
midnight.

## Particles

- **Steam** (`type: 'steam'`): 1–2 px wisps with sinusoidal drift, rising from
  hot table cups (first ~45 s after serving), cups at the pass, raised cups
  mid-sip, and the espresso machine during pull/steam/kettle stages. Plates
  (pastries) never steam, on the table or at the pass.
- **Sparks** (`type: 'spark'`): rare 1-px embers rising inside the firebox.
- Spawned in `updateParticles` (sim), drawn in `SCENE.drawParticles`.

## Captions (the narrator)

The single line of text, bottom-left, that makes a glance feel like a story.

- Pipeline: `caption(world, text)` → `captionQueue` (cap 2) → shown for 4.4 s
  with fade in/out → minimum 6 s gap between captions.
- Voice: warm, understated, present tense, no exclamation-mark enthusiasm
  (one "tak!" allowed). British-cozy rather than game-y.
- Current triggers: arrivals (rain-aware), orders (`withArticle` for correct
  a/an), Nora serving/tidying/clearing, seat choices ("sinks into the armchair
  by the fire", "curls up in the reading nook", "perches on the window
  seat"), window gazes (20% of them, weather/hour-aware: rain on the glass,
  streetlamps, the street drifting by), bookshelf moments (drifting
  over, picking a book out, slipping it back), page turns (12% of them),
  murmuring tables (15%), cup returns, departures (rain/night-aware), cat
  movements and petting, weather changes, lamp threshold moments.
- When adding events, prefer **occasional** captions (probability-gated) —
  the narrator should feel like she only speaks when something is worth
  mentioning.

## Interaction surface (deliberately tiny)

- Click the cat → pet.
- Control bar: volume/mute, rain, fire-crackle audio, music, fullscreen.
- Keyboard: `m`, `f`.
- Everything else watches itself. New interactions must clear a high bar:
  silent-failure-proof, optional, and gentle (see overview.md).
