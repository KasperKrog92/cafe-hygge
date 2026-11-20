# AGENTS.md — Café Hygge

Durable rules for AI agents (and future humans). What is shipped and what comes
next lives in [docs/progression-roadmap.md](docs/progression-roadmap.md);
history lives in git.

## What this is

Café Hygge is a **soft narrative game that is also a companion app**: a cozy
pixel-art café that runs in the browser while its owner reads a book. Autonomous
characters (the café keeper, patrons, a cat) live their small lives over
procedural ASMR-ish audio. Left alone it is pure ambience. Attended to, it is a
soft narrative: the regulars grow histories and small projects that advance
across café days and turn to you (you keep the café as **Lunafreya**) when they
have something to share. There is **no score and no fail state**.

**The design bar for every change: does it make the café cozier, more
glanceable, or gently more alive, without ever nagging or punishing absence?**
Challenge, pressure, decay and UI noise do not belong; warmth, life and story
beats that *wait for you* do. *Arcs advance on their own; their payoffs never
fire on their own and never expire* ([docs/narrative.md](docs/narrative.md)).
Design ethos: [docs/overview.md](docs/overview.md).

## Where the direction lives

- **Build order and the next brief:**
  [progression-roadmap.md](docs/progression-roadmap.md). Its explicit direction
  supersedes older bans on money/upgrades; the no-pressure principle remains.
  Build the named milestone on the current café and keep later ideas out of it.
- **Cast and story:** the accepted
  [community and character plan](docs/plans/community-and-character-stories.md)
  is the creative direction (details revisable as scenes are written; accepting
  it does not mean building its cast or systems in one task).
  [story-bible.md](docs/story-bible.md) separates shipped facts from plans; read
  it before writing dialogue or a story beat, and preserve chosen Lunafreya
  background flags. [narrative.md](docs/narrative.md) owns choices, attendance
  and lasting effects.
- **Startup:** the player chooses the saved game or a fully furnished idle café.
  Idle uses the same renderer and simulation, stays open through day and night,
  and has no tutorials, conversations, planning or home life; its sound changes
  are session-only. It runs the ambient story arcs (scarf, paintings, street
  painter): they advance on the café clock, wait as tappable beats and persist
  in the idle café's own save (`cafe-hygge-idle`, under its own web lock; later
  idle tabs run unsaved). It never touches the game's save or lock. The game's
  quiet-play setting (`life.mode`) is separate and still saves progress.
- **The one mandatory moment:** Holger's first introduction on a new game's
  first day waits at the counter (softly pulsing) until opened, including in
  quiet play, and holds service time until it is complete. No later story beat
  is mandatory.

## Working with the owner

- **Explicit direction is a spec, not a suggestion.** When the owner says how
  something should look or behave, especially art, layout or framing, build
  *exactly that*, then show the result. Do not re-derive their intent or argue
  the design mid-task. If you believe another approach is better, build what was
  asked first and offer the alternative after. (An armchair redesign took three
  passes because the agent kept imposing a front view over the owner's clearly
  stated **side view**.)
- **Show, don't explain.** A rendered screenshot for anything visual, a
  filmstrip (`__dev.film`) for anything that moves. No explanatory diagrams or
  option menus unless asked.
- **Act on a clear instruction immediately.** Don't spend the turn scoping,
  hedging, or verifying things the owner didn't ask about.
- **Place furniture against the room's future use, not only today's routes.**
  Before choosing a location, read the roadmap, relevant improvement briefs and
  [the spatial guidance](docs/art.md#placement-and-future-room-use): planned
  window repair and use, doors, sightlines, later furnishings, and their
  delivery, work and interaction access. Boarded windows, temporary disrepair
  and unshipped features do not make their places free. Both café windows stay
  available for repair and their views; no bookshelf in front of either. A
  passing collision/path audit verifies current routes, not placement. If a
  candidate conflicts with documented future use, or the docs leave a needed
  layout decision open, raise that one decision with the owner; do not invent
  the rest of the layout to resolve it.

## Names and IDs

Display names and save/code IDs differ on purpose; never rename an ID to match
a display name. **Lunafreya** (the player's café keeper) is `world.barista` with
the code/route ID `nora` (`__dev.shot('nora')`, `__dev.noraDo`,
`verify-nora-routing`). **Nora** (the artist regular) has the regular ID
`lunafreya`. The display names were swapped on 7 September 2026; older text may
use the old ones. Settled names: [story-bible.md](docs/story-bible.md).

## Running and testing

Commands, every check and the dev shortcuts are in
[docs/development.md](docs/development.md). The essentials:

- **Desktop only** (Chrome and Safari) until the owner says otherwise. Do not
  expand a desktop task into mobile layouts or verification.
- **Serve and look:** `node tools/serve.js` (preview config `cafe`), then
  `http://localhost:8137/?dev`. `?dev` boots straight into the café with
  `SCENE`, `SIM`, `__dev` and `__world` ready and no splash click (audio still
  needs a real click). The bare URL is the real entry/audio flow. `file://`
  also works, which is why there are no ES modules.
- **See without the pane:** a preview that is not visibly displayed pauses its
  animation frames and screenshots fail. `__dev.shot(target)` renders the live
  world headlessly through the shipping draw list and returns a PNG data URL: a
  region from `__dev.regions`, an entity name (`nora`, `cat`, a patron) or a
  `{x,y,w,h,scale}` crop. `__dev.study({hour, rain, seats})` makes a detached
  art fixture for `__dev.shot(name, {world})`; never assign a study to
  `__world` or tick it.
- **See motion:** `__dev.film({world, target, start, ...})` returns a filmstrip
  of one entity in a private world ([docs/animations.md](docs/animations.md)).
- **Verify:** `powershell -NoProfile -ExecutionPolicy Bypass -File tools/verify-project.ps1`
  runs everything CI runs (Node save/audio regressions, syntax, the one-hour
  soak, every browser check) in about a minute and a half.
  `node tools/run-suites.js --suite a,ui:b` runs chosen browser checks. One-time
  setup: `npm ci --prefix tools`.
- **End every layout or sim change** with `__dev.audit()` → 0 problems (the
  full checks include it).
- **Art passes** follow [docs/art-workflow.md](docs/art-workflow.md):
  `node tools/art-review.js --label before`, then `--label after --verify`.
- **Private simulations** for tests: `SIM.create({ random: SIM.seededRandom(42) })`,
  `__dev.furnishedWorld(o)`, `__dev.modestWorld(o)`, or supply
  `memory: MEMORY.createStore({ state })`. They have silent sound, private
  IDs/timers and no storage side effects. No-argument `SIM.create()` is the
  production persistence/audio context. `SIM.dislodgeCat(world, patron)` and
  `SIM._.makePatron(world, name)` require an explicit world.
- **Any point of the game without waiting:** **stages (dev)** in the `?dev`
  control bar, `?dev&day=12`, or `__dev.play(o)` (`js/dev-stages.js`). The
  `stages` suite plays the whole story with the autoplayer, so a new beat that
  can get stuck fails there.
- **Dev harness** (`js/dev.js`, inert until invoked): the authoritative list of
  URL flags and console calls is the comment at the top of that file.
  `window.__world` is the live world; inspect or poke it freely.

## Git and deployment

- Commit and push directly to `main` unless the owner asks for a branch or a
  pull request.
- Live at <https://hygge.kasper-krog.dk>. **GitHub Pages deploys only from CI**
  (`.github/workflows/ci.yml`) after every check passes; a failing push does
  not change the site.
- **No cache tags to maintain.** `tools/build-site.js` stamps script and style
  URLs with a content hash at deploy time.
- Put the verification record (commands, failures and fixes) in the commit
  message, not in the docs.
- Finish after a successful push. Do not wait for deployment or check the live
  site; the owner will report if an update seems missing.
- `main` is the shared café foundation. The `archive/idle-2026-09-06` and
  `archive/game-2026-09-06` tags are reference material; do not resume the
  separate game engine or merge it.

## Architecture

34 plain scripts, one global per file, loaded in a deliberate order by
`index.html`. The module list with each file's role is at the top of
[docs/architecture.md](docs/architecture.md); contracts follow it.

- `IMPROVEMENTS` (`js/improvements.js`): improvement definitions and the shared
  `offered`/`canBuy` rules; no runtime state.
- `SND` (`js/audio.js`): Web Audio synthesis, buses, loops, one-shots. No samples.
- `SCENE` (`js/scene-*.js`): the renderer. `scene-core.js` creates it and owns
  `SCENE.L`, the palette and `keys()` keyframes; the siblings extend it.
  `SCENE.composeFrame` (`scene-fx.js`) is the one depth-sorted frame composition
  used by `main.js` and `__dev.shot()`.
- `CAST` (`js/characters-roster.js`): regulars, visitors and story arcs as pure
  data.
- `MEMORY` (`js/memory.js`): the versioned save, strict validation, fresh-café
  fallback.
- `SIM` (`js/sim-*.js`): the simulation. `sim-core.js` first (world, movement,
  posture easing, clock, captions, the invitation and regular-gate registries),
  then one file per system or character.
- `__dev` (`js/dev.js`, `js/dev-stages.js`): the harness; consumes the `SIM._`
  contract.
- `js/main.js`: boot, rAF loop, present pass, UI; builds the planner and
  invitation buttons from the registries.

Load order: improvements → audio → scene-core → the other scene files →
characters-roster → memory → sim-core → the other sim files → dev →
dev-stages → main. A new script goes into `index.html` at its place in that
order and into the architecture.md list.

## Invariants and gotchas (learned the hard way)

- **The master canvas is 960×600 (16:10)**; everything renders in master
  coordinates. A 16:9 window shows the 960×540 crop (rows 36–576); other aspects
  get a variable crop (visible height 540–600, width 936–960). The overscan
  strips are texture only: no characters, captions, furniture or interactive
  anchors there. main.js cover-fits the window (integer device-pixel scales
  pixelated, fractional ones sharp-bilinear). Draw in whole pixels; keep
  coordinates integer.
- **C0 uses a smaller 832×516 room (832×468 at 16:9)** with floor bounds in
  `SCENE.L.rooms.small`. The room expansion (150 coins; the partition comes down
  over two café days) opens the full room, saved as `life.room`. The view pulls
  back to the full framing when the work starts (`SCENE.presentation`) while
  floor bounds stay small until it is done. The apartment always uses full
  framing. The expansion opens floor only; separate improvements furnish it.
- **Depth is painter's algorithm by baseline y** (an entity's feet). Furniture
  and characters sort in one array; ties resolve by insertion order (furniture
  before entities). A character wrongly in front of or behind something needs a
  baseline fix, not a z-index.
- **The barista stands at y=286** so she reads hip-up above the counter slab
  (slab y 264–278; front face 278–306, baseline 306). Lower, and the counter
  swallows her; this happened.
- **One ruler: a standing character is 60 px (CH).** Size new art in CH against
  the ruler table in docs/art.md; the espresso machine and pastry case are
  documented, slightly oversized exceptions.
- **All positions come from `SCENE.L`.** Never hardcode a coordinate in the sim
  that exists in `L`. Furniture patrons interact with goes into `L`.
- **Keep the lane clear** (`L.lane = 368`) between wall furniture and tables.
  `makePath` finds direct or visible-corner routes around all furniture with
  shoulder clearance. Never replace it with unchecked straight paths.
- **Cat aerial anchors are exempt from floor footprint rules**: sill, bookshelf,
  counter, machine, back-shelf and lap anchors are checked against their
  declared surface.
- **Bodies never snap between poses.** Sitting, kneeling and crouching go
  through `SIM._.settlePosture` (`LOW_POSES`); walking waits until the body has
  risen; props move with hands (`placeItem`). A one-frame silhouette swap fails
  the `motion` suite ([docs/animations.md](docs/animations.md)).
- **Every sound is gain-staged quietly** (one-shots mostly 0.02–0.08 peak) and
  routed through a compressor. Err on the side of too quiet: this plays next to
  someone reading.
- **Captions are rate-limited** (6 s minimum gap, queue cap 2, shown 4.4 s).
  Emit them through `caption(world, text, rules)` only; conditional claims need
  the live rules in [docs/ambience.md](docs/ambience.md). Initial
  capitalization is automatic; use `withArticle()` for drink names.
- **One clock, many drivers** (main.js): `advance(now)` ticks the sim by real
  elapsed time in ≤0.25 s chunks from rAF, the hidden-tab interval and refocus,
  so browser throttling never slows the café. Periodic logic lives in
  `SIM.update`/`SND.update` (dt-driven), never in rAF-only code, and never
  assumes a dt ceiling below 0.25 s.
- **The first-morning intro is attended.** Its dialogue and assembly hold when
  hidden, paused or in Settings. Skipping dialogue releases that hold; the
  assembly, hug, breath and sign placement still finish normally. This one-time
  exception must never stop ordinary background progression.
- **Two saves.** Settings persist under `cafe-hygge-audio` via `SND.save()`;
  the narrative save is `cafe-hygge-save` via `MEMORY.save()`.
- **Development phase (owner, 24 September 2026): nobody plays yet, so saves
  are not migrated.** Bump `MEMORY.VERSION` whenever the saved shape changes;
  any other version opens a fresh café, never an error. The migration ladder
  stays for when real players exist.
- **Arcs ride the café's own clock.** Arc state lives in the save, definitions
  in `CAST.arcs`. Progress accrues only in `updateNarrative` (dt-driven, one row
  per 24-minute café day while the café runs, hidden tabs included; a closed
  café holds still). `reconcileNarrative` at boot only rebinds, clamps and
  re-applies; it never adds time. A ready beat never plays itself; it waits as
  an invitation until tapped. The audit guards all of this.

## Change playbooks

Each names the files so a session can start with two targeted reads. Every
playbook ends the same way: the full checks pass (`__dev.audit()` → 0 included)
and the matching doc is updated in the same change.

### Add furniture

1. Coordinates into `SCENE.L` (`js/scene-core.js`), never inline.
2. Draw it. Wall-mounted → the background layer in `js/scene-bg.js` (static
   cache for what never changes, per-frame wall pass for what does).
   Floor-standing → a `{y, draw}` drawable with a correct baseline in
   `SCENE.furnitureDrawables` (`js/scene-furniture.js`).
3. Tall enough to fully hide a walker? Declare it in `L.occluders`. Floor pieces
   need a footprint: additions to an existing `L` list get one automatically; a
   new *kind* needs its own `L.footprints` entry (torso-height tables are
   `passable: true`; seats never are, see art.md).
4. Does it glow? A `glow()` call in `SCENE.drawLighting` (`js/scene-fx.js`)
   scaled by `pal.lamp` (candles scale with darkness).
5. Do characters use it? Seats and walk targets in the sim read from `L`
   (seating lives in `js/sim-patrons.js`); keep targets out of occluder spans
   and clear of the lane (`L.lane` ± 16). Items set on it need an anchor in
   `SCENE.tableItemAnchor`.
6. Verify: a `?dev&overlay` screenshot for placement, the art.md furniture
   checklist, the full checks. Doc: art.md (and world.md for lighting).

### Add an improvement (something the owner can buy)

1. A definition in `IMPROVEMENTS.projects` (`js/improvements.js`): price,
   phases/`phaseIds`, `duration`, `capability`, `label`, and as needed
   `tutorial`, `unlockFlag`, `furniture`, `showsWith`, `requires`, `pair`; add
   its id to `IMPROVEMENTS.planOrder`. The planner button, purchase rules and
   save validation follow from it. Bump `MEMORY.VERSION` (new project record).
2. Its delivery and work routine in `js/sim-life.js` (or its character's file),
   its drawables in `js/scene-furniture.js` / `js/scene-bg.js`, and installed
   furniture through `SCENE.hasFurniture` capabilities.
3. Verify with a suite covering purchase, each work phase across a reload,
   closing mid-job and installation (see `tools/verify-bookshelf.js`). Doc:
   progression-roadmap.md status, architecture.md if a contract changed.

### Add a regular's hello or invitation

1. Lines and identity in `CAST` (`js/characters-roster.js`); settled facts in
   story-bible.md.
2. The character's own `js/sim-<name>.js`: availability, the conversation via
   the shared saved-moment boundary (`js/sim-moments.js`), then
   `SIM.addInvitation({ key, actors(world), start(world, actor) })`. Bubbles,
   the canvas tap and the accessible `#meet-<key>` button follow automatically.
   Visit gates and arrival lines: `SIM.gateRegular(id, { mayVisit, due, arrivalLine })`.
   Do not add the character's name to shared loops.
3. Verify with an in-page suite (every hello cursor across a reload, both
   answers, one-time completion) and, for the buttons, a UI flow in `tools/ui/`.

### Add patron behavior

1. Hook it in `js/sim-patrons.js`: a new state in the patron state machine, or,
   for at-the-table flavor, a timer in `updateSeated`. New personality traits go
   on the patron object at spawn in `js/sim-core.js`.
2. Caption it (optional, probability-gated so it stays sparse) and sound it
   (optional) from the state code, never from render; see below.
3. If the body changes shape (sits, crouches, kneels), use a low pose so it
   eases, and film it. Doc: characters.md, world.md for captions.

### Add or change an animation

1. Timing in the simulation (dt-driven state/timers); the renderer only reads
   state. Gestures use `SCENE._.keys`, and hands reach real anchors from `L`.
2. Body height or shape changes go through posture (`LOW_POSES`) or get their
   own in-between; props travel with hands (recipe in animations.md).
3. Film it and keep the `motion` suite at zero pops. Show the owner the strip.

### Add a sound or a caption

- **Sound:** a synth function in `js/audio.js`, routed to the right bus (sfx /
  amb / fire / music; bell-like sounds take the delay send). Peak gain
  0.02–0.08: if it sounds satisfying at demo volume it is too loud. Trigger
  from dt-driven sim code. Doc: a row in sounds.md's one-shot catalog.
- **Caption:** `caption(world, text)` at the trigger site, probability-gated
  (existing gates run 0.12–0.7; only once-per-visit milestones go ungated).
  Doc: the caption/event list in world.md.

## Conventions

- Vanilla ES5-ish JS in IIFEs exposing one global per file, `'use strict'`. No
  classes, no modules, no external libraries in the shipped game. Dev tooling
  may use pinned packages under `tools/`.
- Colors are hex literals from the warm palette in [docs/art.md](docs/art.md);
  reuse existing swatches before inventing new ones.
- Randomness through the local `rnd(a, b)` / `pick(arr)` helpers.
- Captions use a warm, understated narrator voice: quiet, sentence-case, never
  jokey-loud. Danish flavor is welcome ("tak!").
- Character names may be Danish, international or unusually literary; the
  Christianshavn-inspired community has varied backgrounds. Random patrons draw
  from `PATRON_NAMES` in `sim-core.js` (never two of the same name in the room
  at once); keep them distinct from named regulars.

## Docs index

| Doc | Contents |
| --- | --- |
| [docs/overview.md](docs/overview.md) | Vision, design principles, what this is and isn't |
| [docs/progression-roadmap.md](docs/progression-roadmap.md) | Shipped milestones, the next brief, café/home stages, upgrades |
| [docs/development.md](docs/development.md) | Session workflow, tooling, every check and how CI deploys |
| [docs/audit.md](docs/audit.md) | Latest audit: what was measured, what was fixed, what is open |
| [docs/narrative.md](docs/narrative.md) | The soft-narrative contract: invitation-waits rule, arcs, café-day progression, the save model, conversations |
| [docs/story-bible.md](docs/story-bible.md) | Cast identities and voices, remembered choices, shipped and planned story beats |
| [docs/plans/community-and-character-stories.md](docs/plans/community-and-character-stories.md) | Accepted ensemble direction, Lunafreya's history, shared arcs, gifts and romance |
| [docs/architecture.md](docs/architecture.md) | Modules, render pipeline, update loop, data shapes, contracts |
| [docs/characters.md](docs/characters.md) | Lunafreya, patrons, the cat: identities and behavior state machines |
| [docs/animations.md](docs/animations.md) | How characters move, the posture and gesture systems, motion checks and limits |
| [docs/world.md](docs/world.md) | Time, weather, lighting, spawning, captions/events |
| [docs/sounds.md](docs/sounds.md) | Every sound: how it's synthesized, when it triggers, gain levels |
| [docs/art.md](docs/art.md) | Pixel style guide, palette, layout map, lighting pass |
| [docs/art-workflow.md](docs/art-workflow.md) | Repeatable visual review and capture commands |
| [docs/ambience.md](docs/ambience.md) | Rules for captions that claim something about the room |
| [docs/roadmap.md](docs/roadmap.md) | Longer-term ideas, incl. the real-sample audio pipeline |
| [docs/plans/](docs/plans/) | Concrete execution plans. Executed plans are deleted; find them in git history |
| [docs/archive/](docs/archive/) | Retired material kept for reference only (not instructions) |

Keep these docs true: when you change behavior, sounds, layout or characters,
update the matching doc in the same change. Rewrite a rule where it lives
rather than appending a dated note; history belongs in git.
