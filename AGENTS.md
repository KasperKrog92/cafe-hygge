# AGENTS.md — Café Hygge

Guidance for AI agents (and future humans) working on this project.

## What this is

Café Hygge is an **idle café companion app** — a cozy pixel-art café that runs
in the browser while the owner reads a book in real life. Autonomous characters
(a barista, patrons, a cat) live their small lives; procedural ASMR-ish audio
(rain, fire, espresso, page turns) plays underneath. There are **no goals, no
score, no fail states**. It is ambience software.

**The design bar for every change: does it make the café cozier or more
glanceable?** If a feature adds challenge, pressure, or UI noise, it does not
belong. See [docs/overview.md](docs/overview.md) for the full design ethos.

## Running & testing

- No build step, no dependencies, no TypeScript, no modules. Plain script tags.
- Open `index.html` directly (file:// works — this is why there are no ES
  modules), or serve: `python -m http.server 8137` (there is a `.claude/launch.json`
  config named `cafe` for the in-app preview).
- Audio requires one user click (the "step inside" overlay) — browser autoplay
  policy. Everything visual runs before that click.
- Smoke test after changes: load the page, click *step inside*, watch one full
  order cycle (door bell → queue → order → grind/pull/steam → ding → pickup →
  seat), check the console is clean, and jump the clock to verify night
  lighting: `__dev.hour(20)`. Then open with `?dev`, run `__dev.audit()`, and
  expect 0 problems.
- `window.__world` is the live world object — inspect or poke it freely when
  debugging.
- **Dev harness** (`js/dev.js`, inert for the reader-owner): `?dev` boots past
  the start overlay (screenshot-ready, audio still off until a real click),
  `?dev&hour=20` starts at 20:00, `?dev&overlay` boots with the layout
  overlay, `?dev&audit` runs the invariant sweep after load. Console:
  `__dev.hour(h)`, `__dev.ff(seconds)` (fast-forward,
  muted), `__dev.spawn({wantsBook, ownBook, drink, chatty, umbrella, laptop,
  pianist, couple})` (a real patron, or linked pair, with chosen traits),
  `__dev.regular()` (force Holger's next arrival), `__dev.doze()` (sleep the
  first eligible reader), `__dev.send(name, x, y)`,
  `__dev.noraDo('stretch'|'chalk'|'water'|'candles'|'piano')`,
  `__dev.piano(on)`,
  `__dev.kettle()`, `__dev.storm(on)`,
  `__dev.catDo('eat'|'window'|'bookshelf'|'counter'|'topShelf'|'piano'|'lap'|'mote'|'knead')`,
  `__dev.bowls(food, water)`, `__dev.overlay()`,
  `__dev.audit()` (bounds/occlusion/journey/seat/constant invariants plus
  live-world consistency checks — run it after any layout or sim change).

## Git workflow

- Commit and push directly to `main` unless the owner explicitly asks for a
  different branch or a pull request.

## Architecture (11 scripts, deliberate order)

| File | Global | Role |
| --- | --- | --- |
| `js/audio.js` | `SND` | Web Audio synthesis. Buses, ambience loops, one-shot sounds, music box. No samples (yet — see roadmap). |
| `js/scene-core.js` | `SCENE` | Creates the renderer global; owns `SCENE.L`, palette interpolation, and shared drawing helpers. |
| `js/scene-bg.js` | `SCENE` | Static background cache and the dynamic wall layer: window, door, fireplace, shelves, lamps, and espresso machine. |
| `js/scene-furniture.js` | `SCENE` | Depth-sorted furniture drawables: tables, chairs, bookshelf, lamps, counter, and plants. |
| `js/scene-people.js` | `SCENE` | People, cat, speech bubbles, and order icons. |
| `js/scene-fx.js` | `SCENE` | Lighting, particles, and caption rendering. |
| `js/sim-core.js` | `SIM` | Creates the simulation global; owns world creation, shared movement, clock/weather/door/spawning, captions, and particles. |
| `js/sim-patrons.js` | `SIM` | Patron seating, ordering, reading, chatting, and departure state machine. |
| `js/sim-characters.js` | `SIM` | Nora and cat state machines plus the main simulation update and entity-drawable bridge. |
| `js/dev.js` | `__dev` | Dev/agent harness: `?dev` boot, clock jumps, fast-forward, scenario forcing, layout overlay, invariant audit. Inert unless invoked. |
| `js/main.js` | — | Boot, rAF loop, depth-sort render pass, UI controls. |

Load order matters: audio → scene-core → scene-bg → scene-furniture →
scene-people → scene-fx → sim-core → sim-patrons → sim-characters → dev →
main. Scene-core creates `SCENE`; the four renderer siblings extend it. The
three sim scripts then build `SIM`; dev consumes its `SIM._` debug contract
and decorates the boot, and main reads all.

Full detail: [docs/architecture.md](docs/architecture.md).

## Invariants & gotchas (learned the hard way)

- **The master canvas is 960×600 (16:10)**; everything renders there in
  master coordinates. A 16:9 window shows the 960×540 crop (rows 36–576);
  other aspects get a variable crop (visible height 540–600, width 936–960 —
  the overscan strips are texture only, never content: no characters,
  captions, furniture or interactive anchors may live there). The viewport
  manager in main.js cover-fits the window: exact integer device-pixel scales
  present pixelated, fractional scales via sharp-bilinear (integer nearest
  upscale + smooth downscale). Draw in whole pixels; keep coordinates integer.
- **Depth sorting is painter's-algorithm by baseline y** (an entity's feet).
  Furniture and characters go into one array sorted by `y`; ties resolve by
  insertion order (furniture is concatenated before entities — JS sort is
  stable). If a character appears in front of / behind something wrongly, the
  fix is a baseline, not a z-index.
- **The barista stands at y=286** so she reads hip-up above the counter slab
  (slab spans y 264–278; front face 278–306, baseline 306). Move her lower and
  the counter swallows her entirely — this happened; don't repeat it.
- **One ruler: a standing character is 60 px (CH).** The proportion pass
  (executed; its plan doc is retired to git history) sized everything relative
  to it — wall line at y=232, door 102 tall, counter 42 tall. When adding art,
  size it in CH against the ruler table in docs/art.md; the espresso machine
  and pastry case are documented exceptions (slightly oversized hero props).
- **All positions come from `SCENE.L`**. Never hardcode a coordinate in the sim files
  that exists in `L`. If you add furniture patrons interact with, add it to `L`.
- **Characters walk the lane** (`L.lane = 368`) between the wall furniture and
  the tables. Paths are L-shaped: vertical to lane → horizontal → vertical to
  target. Straying from this causes people to walk "through" tables.
- **Cat aerial anchors are exempt from floor footprint rules**: sill,
  bookshelf, counter, machine, back-shelf, and lap anchors are checked against
  their declared surface instead. Cat floor stops and declared routes still
  pass the normal footprint/occlusion audit.
- **Every sound is gain-staged quietly** (one-shots mostly 0.02–0.08 peak) and
  routed through a compressor. When adding sounds, err on the side of too
  quiet — this app plays next to someone reading.
- **Captions are rate-limited** (6 s minimum gap, queue cap 2, shown 4.4 s).
  Emit captions through `caption(world, text)` only; use `withArticle()` for
  drink names ("an espresso").
- The **hidden-tab interval** (250 ms tick in main.js) keeps the sim and audio
  alive when the tab isn't rendering. New periodic logic must live in
  `SIM.update`/`SND.update` (dt-driven), never in rAF-only code.
- Settings persist in `localStorage` under `cafe-hygge-audio` via `SND.save()`.

## Change playbooks

The recurring change shapes, as recipes. Each names the exact files and
functions so a session can start with two targeted reads instead of seven.
Every playbook ends the same way: `__dev.audit()` → 0 problems, and the
matching doc updated in the same change.

### Add furniture

1. Coordinates into `SCENE.L` (`js/scene-core.js`) — never inline.
2. Draw it. Wall-mounted → the background layer in `js/scene-bg.js` (static
   cache for what never changes, per-frame wall pass for what does).
   Floor-standing → push a `{y, draw}` drawable with a correct baseline in
   `SCENE.furnitureDrawables` (`js/scene-furniture.js`).
3. Tall enough to fully hide a walker? Declare it in `L.occluders`
   (`js/scene-core.js`) — the overlay, the audit, and the sim share that list.
   Floor-standing pieces also need a footprint box: additions to an existing
   `L` list (tables, chairs, lamps…) get one derived automatically in
   scene-core.js; a new *kind* of furniture needs its own `L.footprints`
   entry there (mark torso-height tables `passable: true`; seats never are —
   see art.md).
4. Does it glow? Add a `glow()` call in `SCENE.drawLighting`
   (`js/scene-fx.js`) scaled by `pal.lamp` (candles instead scale with
   darkness).
5. Do characters use it? Add seats / walk targets in the sim reading from
   `L` (seating lives in `js/sim-patrons.js`); keep targets out of occluder
   spans and clear of the lane (`L.lane` ± 16).
6. Verify: `?dev&overlay` screenshot for placement, the depth checks from
   the art.md furniture checklist, `__dev.audit()`. Doc: art.md (and
   world.md if it changed the lighting pass).

### Add patron behavior

1. Hook it in `js/sim-patrons.js`: a new state in the patron state machine,
   or — for at-the-table flavor — a timer in `updateSeated`. New personality
   traits go on the patron object at spawn in `js/sim-core.js`.
2. Caption it (optional, probability-gated so it stays sparse):
   `caption(world, text)` from `js/sim-core.js` — rate limiting is inside;
   `withArticle()` for drink names; lowercase-cozy voice.
3. Sound it (optional): pick an existing `SND` one-shot or add one (see the
   sound playbook); trigger it from the state code, never from render.
4. Watch it fast: `__dev.spawn({wantsBook, ownBook, drink, chatty})` +
   `__dev.ff(seconds)`. Doc: characters.md (state machine tables), world.md
   if it emits captions/events.

### Add a sound / a caption

- **Sound:** synth function in `js/audio.js`, routed to the right bus (sfx /
  amb / fire / music; bell-like sounds take the delay send). Peak gain
  0.02–0.08 — if it sounds satisfying at demo volume it's too loud. Trigger
  from dt-driven sim code (`SIM.update` path — hidden tabs must still tick
  it). Doc: a row in sounds.md's one-shot catalog (function, trigger,
  recipe, gain).
- **Caption:** `caption(world, text)` at the trigger site, probability-gated
  (existing gates run 0.12–0.7; only once-per-visit milestones go ungated);
  the shared limiter handles pacing. Voice: warm,
  understated, lowercase-cozy, Danish flavor welcome. Doc: the caption/event
  list in world.md.

## Conventions

- Vanilla ES5-ish JS in IIFEs exposing one global per file. `'use strict'`.
  No classes, no modules, no external libraries — keep the zero-dependency
  promise.
- Colors are hex literals chosen from the warm palette in
  [docs/art.md](docs/art.md); reuse existing swatches before inventing new ones.
- Randomness through the local `rnd(a, b)` / `pick(arr)` helpers.
- Captions are written in a warm, understated narrator voice — lowercase-cozy,
  never jokey-loud. Danish flavor is welcome ("tak!").
- Character names are Danish. New patrons draw from the `NAMES` pool in `sim-core.js`.

## Docs index

| Doc | Contents |
| --- | --- |
| [docs/overview.md](docs/overview.md) | Vision, design principles, what this is and isn't |
| [docs/architecture.md](docs/architecture.md) | Modules, render pipeline, update loop, data shapes |
| [docs/characters.md](docs/characters.md) | Nora, patrons, the cat — identities and full behavior state machines |
| [docs/world.md](docs/world.md) | Time, weather, lighting, spawning, captions/events |
| [docs/sounds.md](docs/sounds.md) | Every sound: how it's synthesized, when it triggers, gain levels |
| [docs/art.md](docs/art.md) | Pixel style guide, palette, layout map, lighting pass |
| [docs/roadmap.md](docs/roadmap.md) | Future plans, incl. the real-sample audio pipeline |
| [docs/plans/](docs/plans/) | Concrete execution plans. Executed plans are deleted; find them in git history |

Keep these docs true: when you change behavior, sounds, layout, or characters,
update the matching doc in the same change.
