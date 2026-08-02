# Roadmap

Unordered ideas, roughly grouped, each judged against the one bar that
matters: *does it make the café cozier or more glanceable?* (overview.md).
Nothing here is committed; the owner picks what sounds lovely next.

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
5. **Loops with variation:** long beds (rain, room tone, fire) as loopable
   files with gentle crossfade on loop points; keep intensity driven by
   `world.rain` / toggles exactly as today.
6. Document each replacement in sounds.md (recipe column becomes "sample:
   filename + credit/license").

## 🔊 More sound, still synthesized

- Distant thunder on heavy rain (very rare, very low).
- Kettle whistle far off in the back room, once an evening.
- Chair scrape (tiny, filtered) when patrons sit/stand.
- Coins in the tip jar when a patron returns a cup.
- A generative lo-fi layer (soft chords under the music box, night only).
- Church bells at noon, faint, from across the street.

## 🐈 More life

- Cat: counter-hopping (Nora shoos it, one caption), lap-sitting on armchair
  readers, window-watching in rain, chasing a dust mote, kneading the rug.
- Nora: watering the plants, chalking the menu (board doodle changes),
  lighting the candles at dusk (tie candle glow to an actual action),
  a quiet stretch when the café is empty.
- Patrons: umbrellas on rainy days (shaken at the door), laptops (soft rare
  keystrokes), a regular who always takes the same seat, couples sharing a
  table, someone who falls asleep over their book at night.
- A café dog that visits occasionally and naps by the door. The cat has
  opinions (one caption, no drama).

## 🌍 More world

- **Seasons**: snow falling past the window, frost corners on the glass,
  autumn leaves, summer evening light running later. Could follow the real
  date.
- Holiday touches (subtle): a string of lights in December, a pumpkin on the
  mantel in October.
- Window bar seating (two stools facing the glass) — needs a sill-height
  redesign so seated heads align with the view.
- Passers-by outside the window: silhouettes with umbrellas.
- The mantel clock chiming softly on the hour (in-world time).
- A real "closing hour" mood at 02:00: Nora stacks chairs, lights low, only
  the fire and the cat — never actually closed, just quieter.

## 🖥️ Delivery & polish

- PWA manifest (installable, remembers window size) — probably the best
  effort-to-value next step for "runs in the corner of my screen".
- Electron/Tauri wrap only if the owner wants always-on-top.
- OBS-friendly mode (no controls, no start overlay once audio unlocked).
- `?seed=` and `?hour=` URL params for reproducible/instant moods.
- Accessibility: `prefers-reduced-motion` → calmer particles/flicker.
- Optional ultra-low-power mode (10 fps render, full-rate audio).

## 🚫 Explicitly out (unless the vision changes)

Scores, currencies, upgrades, timers, notifications, chat integrations,
anything that asks the reader to stop reading.
