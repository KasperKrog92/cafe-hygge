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
  lighting: `__world.t = (20 - 8.4) / 24 * 1440` in the console.
- `window.__world` is the live world object — inspect or poke it freely when
  debugging.

## Architecture (4 files, deliberate order)

| File | Global | Role |
| --- | --- | --- |
| `js/audio.js` | `SND` | Web Audio synthesis. Buses, ambience loops, one-shot sounds, music box. No samples (yet — see roadmap). |
| `js/scene.js` | `SCENE` | All pixel-art drawing + the shared layout constant `SCENE.L`. Owns *where things are* and *what they look like*. |
| `js/sim.js` | `SIM` | State machines: patrons, barista, cat, weather, clock, captions, particles. Owns *what happens*. |
| `js/main.js` | — | Boot, rAF loop, depth-sort render pass, UI controls. |

Load order matters: audio → scene → sim → main (sim reads `SCENE.L`; main reads both).

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
- **All positions come from `SCENE.L`**. Never hardcode a coordinate in sim.js
  that exists in `L`. If you add furniture patrons interact with, add it to `L`.
- **Characters walk the lane** (`L.lane = 368`) between the wall furniture and
  the tables. Paths are L-shaped: vertical to lane → horizontal → vertical to
  target. Straying from this causes people to walk "through" tables.
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

## Conventions

- Vanilla ES5-ish JS in IIFEs exposing one global per file. `'use strict'`.
  No classes, no modules, no external libraries — keep the zero-dependency
  promise.
- Colors are hex literals chosen from the warm palette in
  [docs/art.md](docs/art.md); reuse existing swatches before inventing new ones.
- Randomness through the local `rnd(a, b)` / `pick(arr)` helpers.
- Captions are written in a warm, understated narrator voice — lowercase-cozy,
  never jokey-loud. Danish flavor is welcome ("tak!").
- Character names are Danish. New patrons draw from the `NAMES` pool in sim.js.

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
| [docs/plans/](docs/plans/) | Concrete execution plans. Current: [agent workflow pass](docs/plans/agent-workflow-pass.md) (planned — dev harness, file splits, doc slimming). Executed plans are deleted; find them in git history |

Keep these docs true: when you change behavior, sounds, layout, or characters,
update the matching doc in the same change.
