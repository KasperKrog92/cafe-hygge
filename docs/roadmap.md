# Roadmap

Unordered ideas, roughly grouped, each judged against the one bar that
matters: *does it make the café cozier or more glanceable?* (overview.md).
Nothing here is committed; the owner picks what sounds lovely next.

> **Graduated & executed:** the native high resolution, the
> proportion/composition passes, the agent workflow pass (dev harness,
> file splits, doc slimming — future changes cost less), and the harness
> sweep (a multi-day soak-test bug hunt plus the journey/footprint rules now
> in `__dev.audit()`), and cat life (corner + bowl care, high perches,
> counter/shelf capers, laps, kneading, and dust motes), Nora's care rituals
> (watering, chalkboard doodles, dusk candles, quiet stretches), and patron
> life (umbrellas, laptops, Holger, couples, night dozing) were specced here,
> executed, and their plan docs
> retired (git history has them).

## 🎧 Real sound clips (owner-requested — design ready)

The owner would like to eventually supply actual recordings (espresso
machines, rain, café room tone…). Plan for when clips arrive:

1. **Layout:** `assets/sounds/` with a `manifest.js` (plain script, keeps the
   no-build promise) mapping sound ids to files:
   `window.SOUND_MANIFEST = { espresso: ['espresso-1.ogg', 'espresso-2.ogg'], … }`
   Multiple takes per id → random pick per play, ±few cents playbackRate
   jitter so repeats never sound identical.
2. **Loader in audio.js:** after `SND.init()`, `fetch` + `decodeAudioData`
   each file lazily; store buffers per id.
3. **Hybrid playback:** every `SND.*` function checks for a loaded buffer
   first, else falls back to the current synthesis — the café must sound whole
   even with zero/partial assets, and file:// (where fetch may fail) keeps
   working via the synth path.
4. **Same buses and gain discipline:** samples route through the existing
   sfx/amb/fire/music buses and the delay send; normalize clips beforehand,
   then trim per-id gain in the manifest (`{file, gain}` entries).
5. **Loops with variation:** long beds (storm rain, room tone, fire) as
   loopable files with gentle crossfade on loop points; keep intensity driven
   by `world.rain` / toggles. (Normal rain is discrete window taps, not a
   bed — see sounds.md.)
6. Document each replacement in sounds.md (recipe column becomes "sample:
   filename + credit/license").

## 🔊 More sound, still synthesized (plan ready — see [plans/more-sound.md](plans/more-sound.md))

Pooled into four independently shippable phases: small foley → the town
keeps time → thunderstorms → a night music layer. The mantel-clock chime
moved here from "More world" — the clock art already exists and keeps
time, so the chime is purely a sound feature.

- **Thunderstorms** (owner-requested). A rare storm state above heavy rain
  in the sim's weather walk. Only during a storm does the rain get a voice
  beyond the window taps: the hissing broadband wash returns (the retired
  recipe is in git history — noise loop → highpass → cascaded lowpasses,
  slow two-LFO swell; keep it dark, it is still heard through glass), plus
  distant thunder — very rare, very low filtered-noise rumbles, seconds
  long, maybe a brief dim flash through the window. Normal rain stays
  taps-only by design (the wash felt like standing outside in it).
- Kettle whistle far off in the back room, once an evening.
- Chair scrape (tiny, filtered) when patrons sit/stand.
- Coins in the tip jar when a patron returns a cup.
- A generative lo-fi layer (soft chords under the music box, night only).
- Church bells at noon, faint, from across the street.
- The mantel clock chiming softly — but one in-world hour is one real
  minute, so "on the hour" would be a metronome; the plan gates it to a
  few chosen hours.

Further sound ideas, not yet in the plan:

- The street heard through the open door: while the door stands open, the
  outside (rain taps, storm wash) lifts a touch, then ducks back as it
  swings shut.
- A spoon stirred twice around a fresh cup — two or three tiny porcelain
  tinks just after a drink lands on the table.
- The espresso machine sighing off pressure — a soft "pff" every few idle
  minutes, nobody near it.
- One creaky floorboard near the door that only sounds sometimes.
- Radiator ticks on cold evenings — gentle metal pings as the heat comes
  up (pairs with seasons, below).
- Book foley at the shelf: fingertip ticks along the spines while
  browsing, a soft cover thump on take and return.

## 🐈 More life

- A café dog that visits occasionally and naps by the door. The cat has
  opinions (one caption, no drama).
- A knitter by the fire on rainy evenings — needle clicks quieter than the
  crackles, a slowly growing scarf.
- Someone writing postcards at a window table: pen scratches, a pause to
  look out, one careful stamp.
- A patron who greets the cat on the way in — one crouch, one pat, and on
  to the queue.

## 🌍 More world

- **Seasons**: snow falling past the window, frost corners on the glass,
  autumn leaves, summer evening light running later. Could follow the real
  date.
- Holiday touches (subtle): a string of lights in December, a pumpkin on the
  mantel in October.
- Passers-by outside the window: silhouettes with umbrellas.
- A real "closing hour" mood at 02:00: Nora stacks chairs, lights low, only
  the fire and the cat — never actually closed, just quieter.

## 🚫 Explicitly out (unless the vision changes)

Scores, currencies, upgrades, timers, notifications, chat integrations,
anything that asks the reader to stop reading.
