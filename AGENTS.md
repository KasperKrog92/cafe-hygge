# AGENTS.md — Café Hygge

Guidance for AI agents (and future humans) working on this project. This file
holds durable rules; what is shipped and what comes next lives in
[docs/progression-roadmap.md](docs/progression-roadmap.md), and history lives
in git.

## What this is

Café Hygge is a **soft narrative game that is also a companion app**: a cozy
pixel-art café that runs in the browser while its owner reads a book in real
life. Autonomous characters (the café keeper, patrons, a cat) live their small
lives; procedural ASMR-ish audio (rain, fire, espresso, page turns) plays
underneath. Left alone it is pure ambience, whole if you never touch it.
Attended to, it is a soft narrative: the regulars grow histories and small
projects that advance in the background across café days, and turn to you —
you keep the café as **Lunafreya** — when they have something to share. There
is **no score and no fail state**; progression is patient, never pressure.

**The design bar for every change: does it make the café cozier, more
glanceable, or gently more alive — without ever nagging or punishing absence?**
A feature that adds challenge, pressure, decay, or UI noise does not belong; one
that adds warmth, life, or a story beat that *waits for you* does. The rule that
reconciles idle progression with never-miss-out — *arcs advance on their own;
their payoffs never fire on their own and never expire* — lives in
[docs/narrative.md](docs/narrative.md). See [docs/overview.md](docs/overview.md)
for the full design ethos.

## Where the direction lives

- **Build order, shipped milestones and the next brief:**
  [progression-roadmap.md](docs/progression-roadmap.md). Its explicit direction
  supersedes older bans on money/upgrades; the no-pressure principle remains.
  Build the named milestone on the current café, keeping later ideas out of it.
- **Cast and story:** the accepted
  [community and character plan](docs/plans/community-and-character-stories.md)
  is the working creative direction (details revisable as scenes are written);
  [story-bible.md](docs/story-bible.md) separates shipped facts from plans;
  [narrative.md](docs/narrative.md) owns choices, attendance and lasting effects.
  Acceptance of the larger plan does not mean its cast or systems should be
  built in one task.
- **The one mandatory moment:** Holger's first introduction on a new café's
  first day waits at the counter (softly pulsing) until opened, in both modes,
  and holds service time until it is complete. This tutorial exception does not
  make any later story beat mandatory.

## Working with the owner

- **Place furniture against the room's future use as well as today's routes.**
  Before choosing a location, read the progression roadmap, relevant improvement
  briefs and [the spatial guidance](docs/art.md#placement-and-future-room-use).
  Check planned window repair/use, doors, sightlines, later furnishings and
  improvements, and their delivery, work and interaction access. Boarded windows,
  temporary disrepair and not-yet-shipped features do not make their places free
  space. Both café windows must remain available for repair and their eventual
  views; do not put a bookshelf in front of either. A passing collision/path
  audit verifies current routes, not placement approval. If a candidate conflicts
  with documented future use, or the docs leave a necessary layout decision
  unsettled, raise that specific decision with the owner before placing it.
  Do not invent the rest of the future layout to resolve it.
- **Explicit direction is a spec, not a suggestion.** When the owner says how
  something should look or behave — especially art, layout, or framing —
  implement *exactly that*, then show the result. Do not re-derive their intent,
  substitute your own mental model, or argue the design mid-task. If you
  genuinely believe a different approach is better, build what was asked first
  and offer the alternative *after*. (Learned the hard way: an armchair redesign
  took three passes because the agent kept re-imposing a front-view reading over
  the owner's clearly stated **side-view** one.)
- **Show, don't explain.** For anything visual, a rendered screenshot ends the
  argument faster than paragraphs; for anything that moves, a filmstrip
  (`__dev.film`). Skip explanatory diagrams and option menus unless asked.
- **Act on a clear instruction immediately.** Don't burn the turn scoping,
  hedging, or verifying things the owner didn't ask about.

## Names and IDs

Display names and save/code IDs differ on purpose; never rename an ID to match
a display name. **Lunafreya** (the player's café keeper) is `world.barista` with
the code/route ID `nora` (`__dev.shot('nora')`, `__dev.noraDo`,
`verify-nora-routing`). **Nora** (the artist regular) has the regular ID
`lunafreya`. The two were swapped on 7 September 2026; older text may still use
the old names. Settled names are in [story-bible.md](docs/story-bible.md).

## Running & testing

- **Desktop only until the owner says otherwise** (Chrome and Safari). Mobile
  layouts and verification are deferred; do not expand a desktop task into them.
- **Serve and look:** `node tools/serve.js` (preview config `cafe`), then open
  `http://localhost:8137/?dev` — with `?dev`, which boots straight into the café
  with `SCENE`, `SIM`, `__dev` and `__world` ready and no splash click (audio
  still needs a real click). The bare URL is for the real entry/audio flow.
  `file://` also works (this is why there are no ES modules).
- **See without the pane:** if the in-app preview is not visibly displayed its
  animation frames pause and screenshots fail. `__dev.shot(target)` renders the
  live world headlessly through the shipping draw list (`SCENE.composeFrame`)
  and returns a PNG data URL: a region from `__dev.regions`, an entity name
  (`nora`, `cat`, a patron) or a `{x,y,w,h,scale}` crop.
  `__dev.study({hour, rain, seats})` makes a detached art fixture for
  `__dev.shot(name, {world})`; never assign a study to `__world` or tick it.
- **See motion:** `__dev.film({world, target, start, ...})` returns a filmstrip
  of one entity in a private world. Stills cannot show snaps; see
  [docs/animations.md](docs/animations.md).
- **Verify:** `powershell -NoProfile -ExecutionPolicy Bypass -File tools/verify-project.ps1`
  runs everything CI runs: Node save/audio regressions, syntax, the one-hour
  soak and every browser check (in-page suites `tools/verify-*.js` and UI flows
  `tools/ui/*.js`) through `node tools/run-suites.js`, each in a fresh browser
  context. One-time setup: `npm ci --prefix tools` (pinned playwright-core; it
  drives the installed Chrome). See [docs/development.md](docs/development.md).
- **Art passes** start with [docs/art-workflow.md](docs/art-workflow.md):
  `node tools/art-review.js --label before`, then `--label after --verify`.
- **End every layout or sim change** with `__dev.audit()` → 0 problems (the
  full checks include it).
- **Private simulations:** use `SIM.create({ random: SIM.seededRandom(42) })`,
  `__dev.furnishedWorld(o)` or `__dev.modestWorld(o)` for tests, or supply
  `memory: MEMORY.createStore({ state })`. No-argument creation is the
  production persistence/audio context. Private worlds have silent sound,
  private IDs/timers and no storage side effects. `SIM.dislodgeCat(world, patron)`
  and `SIM._.makePatron(world, name)` require an explicit world.
- `window.__world` is the live world object — inspect or poke it freely.
- **Temporary apartment shortcut:** **apartment (dev)** in the control bar, or
  `__dev.home()`, runs the real closing into a game-mode home that waits for
  **go to sleep**.
- **Dev harness** (`js/dev.js`, inert until invoked): the authoritative list of
  URL flags and console calls is the comment at the top of that file. The ones
  used most: `?dev&hour=20`, `?dev&overlay`, `?dev&audit`,
  `?dev&arc=id&stage=n&progress=n&ready`, `__dev.hour(h)`, `__dev.ff(s)`,
  `__dev.spawn({...})`, `__dev.regular(id)`, `__dev.arc(id, o)`,
  `__dev.noraDo(name)`, `__dev.catDo(name)`, `__dev.shot()`, `__dev.film()`,
  `__dev.audit()`.

## Git and deployment

- Commit and push directly to `main` unless the owner explicitly asks for a
  different branch or a pull request.
- Live at <https://hygge.kasper-krog.dk>. **GitHub Pages deploys only from CI**
  (`.github/workflows/ci.yml`), after the Node checks, the soak and every
  browser check pass. A failing push does not change the site.
- **No cache tags to maintain.** `tools/build-site.js` stamps every script and
  style URL with a content hash at deploy time; source `index.html` has none.
- Put the verification record (commands, failures and fixes) in the commit
  message, not in the docs.
- Finish after a successful push. Do not routinely wait for deployment or check
  the live site; the owner will report if an update seems missing.
- `main` is the shared café foundation, consolidated on 6 September 2026. The
  retired `archive/idle-2026-09-06` and `archive/game-2026-09-06` tags are
  reference material; do not resume the separate game engine or merge it.

## Architecture (25 scripts, deliberate order)

| File | Global | Role |
| --- | --- | --- |
| `js/improvements.js` | `IMPROVEMENTS` | Improvement definitions (price, phases, planner label, unlock flag, furniture rules, capabilities) and the shared `offered`/`canBuy` rules; no runtime state. |
| `js/audio.js` | `SND` | Web Audio synthesis. Buses, ambience loops, one-shot sounds, music box. No samples (yet — see roadmap). |
| `js/scene-core.js` | `SCENE` | Creates the renderer global; owns `SCENE.L`, palette interpolation, shared drawing helpers and `keys()` keyframes. |
| `js/scene-waterfront.js` | `SCENE` | Continuous exterior, sun/window-light geometry, far-bank painter, lake and terrace rendering. |
| `js/scene-bg.js` | `SCENE` | Static background cache and the dynamic wall layer: window, door, fireplace, shelves, lamps, and espresso machine. |
| `js/scene-furniture.js` | `SCENE` | Depth-sorted furniture drawables: tables, chairs, bookshelf, lamps, counter, plants, and the easel station/canvas. |
| `js/scene-people.js` | `SCENE` | People (walking, posture crouches, station work, seated activities), the cat, speech bubbles and order icons. |
| `js/scene-fx.js` | `SCENE` | Lighting, particles, captions, and `SCENE.composeFrame` — the one depth-sorted frame composition used by `main.js` and `__dev.shot()`. |
| `js/scene-home.js` | `SCENE` | Sparse apartment and saved plant/table/hearth work drawables. |
| `js/scene-intro.js` | `SCENE` | First-morning speech bubbles, handmade sign and doorway porch. |
| `js/characters-roster.js` | `CAST` | The regulars and visitors **and story arcs** as pure data: looks, drinks, habits, usual seats, line pools, dialogue packets. |
| `js/memory.js` | `MEMORY` | The persistent save (`cafe-hygge-save`): versioned JSON (arcs, bonds, flags, life), strict validation and a fresh-café fallback. Loaded before sim-core. |
| `js/sim-core.js` | `SIM` | World creation, shared movement and **posture easing**, clock/weather/door/spawning, captions, particles, and the **invitation and regular-gate registries**. |
| `js/sim-waterfront.js` | `SIM` | Dt-driven boats, birds and planes; terrace reservations, guests and cleanup journeys. |
| `js/sim-patrons.js` | `SIM` | Patron seating, ordering, reading, chatting, and departure state machine. |
| `js/sim-shop.js` | `SIM` | Opening/closing lifecycle factory: clock hold, daily rituals and shop routes. |
| `js/sim-characters.js` | `SIM` | Lunafreya and cat state machines, the main `SIM.update` and the entity-drawable bridge. |
| `js/sim-life.js` | `SIM` | Shared home, presentation, plant, interruptible projects, window/mantel work and first-opening assembly. |
| `js/sim-intro.js` | `SIM` | Saved first-morning dialogue, cat hug, silent breath and sign placement. |
| `js/sim-moments.js` | `SIM` | Shared attended conversations, saved acknowledgements/replies, approach and return; Holger's introduction (registers its invitation). |
| `js/sim-gerda.js` | `SIM` | Gerda's window gate, pillow offer, gift placement and thank-you (registers her invitation and visit gate). |
| `js/sim-visitors.js` | `SIM` | Keira and Tomas: jobs, visits and saved greetings (registers their invitations). |
| `js/sim-home.js` | `SIM` | Saved first apartment tour, required first planner and bedtime sequence. |
| `js/dev.js` | `__dev` | Dev/agent harness: `?dev` boot, clock/arc forcing, fast-forward, scenario forcing, fixtures, overlay, `shot`, `film`, invariant audit. Inert unless invoked. |
| `js/main.js` | — | Boot, rAF loop, present pass, UI controls; builds the planner and invitation buttons from the registries. |

Load order matters: improvements → audio → scene-core → scene-waterfront →
scene-bg → scene-furniture → scene-people → scene-fx → scene-home → scene-intro →
characters-roster → memory → sim-core → sim-waterfront → sim-patrons → sim-shop →
sim-characters → sim-life → sim-intro → sim-moments → sim-gerda → sim-visitors →
sim-home → dev → main. Scene-core creates `SCENE` and the renderer siblings
extend it; `CAST` is pure data; `MEMORY` loads the save; the eleven sim scripts
build `SIM` (sim-core first); dev consumes the `SIM._` contract; main reads all.

Full detail: [docs/architecture.md](docs/architecture.md).

## Invariants & gotchas (learned the hard way)

- **C0 uses a smaller 832×516 room (832×468 at 16:9)** with floor bounds in
  `SCENE.L.rooms.small`. The full room remains available for a future expansion;
  its size is saved separately as `life.room`. The apartment always uses full
  framing.
- **The master canvas is 960×600 (16:10)**; everything renders there in
  master coordinates. A 16:9 window shows the 960×540 crop (rows 36–576);
  other aspects get a variable crop (visible height 540–600, width 936–960 —
  the overscan strips are texture only, never content: no characters,
  captions, furniture or interactive anchors may live there). The viewport
  manager in main.js cover-fits the window: exact integer device-pixel scales
  present pixelated, fractional scales via sharp-bilinear. Draw in whole
  pixels; keep coordinates integer.
- **Depth sorting is painter's-algorithm by baseline y** (an entity's feet).
  Furniture and characters go into one array sorted by `y`; ties resolve by
  insertion order (furniture before entities). If a character appears in
  front of / behind something wrongly, the fix is a baseline, not a z-index.
- **The barista stands at y=286** so she reads hip-up above the counter slab
  (slab spans y 264–278; front face 278–306, baseline 306). Move her lower and
  the counter swallows her entirely — this happened; don't repeat it.
- **One ruler: a standing character is 60 px (CH).** Size new art in CH against
  the ruler table in docs/art.md; the espresso machine and pastry case are
  documented exceptions (slightly oversized hero props).
- **All positions come from `SCENE.L`**. Never hardcode a coordinate in the sim
  files that exists in `L`. If you add furniture patrons interact with, add it
  to `L`.
- **Keep the lane clear** (`L.lane = 368`) between wall furniture and tables.
  `makePath` finds direct or visible-corner routes around all furniture, with
  shoulder clearance. Never replace this with unchecked straight paths.
- **Cat aerial anchors are exempt from floor footprint rules**: sill, bookshelf,
  counter, machine, back-shelf and lap anchors are checked against their
  declared surface instead.
- **Bodies never snap between poses.** Sitting, kneeling and crouching go through
  `SIM._.settlePosture` (`LOW_POSES`); walking waits until the body has risen;
  props move with hands (`placeItem`). A change that swaps a silhouette in one
  frame fails the `motion` suite. See [docs/animations.md](docs/animations.md).
- **Every sound is gain-staged quietly** (one-shots mostly 0.02–0.08 peak) and
  routed through a compressor. Err on the side of too quiet — this app plays
  next to someone reading.
- **Captions are rate-limited** (6 s minimum gap, queue cap 2, shown 4.4 s).
  Emit captions through `caption(world, text, rules)` only; conditional claims
  need the live rules in [docs/ambience.md](docs/ambience.md). Initial
  capitalization is automatic; use `withArticle()` for drink names.
- **One clock, many drivers** (main.js): `advance(now)` ticks the sim by real
  elapsed time in ≤0.25 s chunks from rAF, the hidden-tab interval and refocus,
  so browser throttling never slows the café. New periodic logic must live in
  `SIM.update`/`SND.update` (dt-driven), never in rAF-only code, and never
  assume a dt ceiling below 0.25 s.
- **The first-morning intro is attended.** Its dialogue and assembly hold when
  hidden, paused or in Settings. Skipping dialogue releases that hold; the
  actual assembly, hug, breath and sign placement still finish normally. This
  one-time exception must never stop ordinary background café progression.
- Settings persist in `localStorage` under `cafe-hygge-audio` via `SND.save()`.
- **The narrative save is separate** (`cafe-hygge-save` via `MEMORY.save()`).
  **Development phase (owner, 24 September 2026): nobody plays yet, so saves
  are not migrated.** Bump `MEMORY.VERSION` whenever the saved shape changes;
  any other version opens a fresh café, never an error. The migration ladder
  stays for when real players exist. Arc *state* lives in the save; arc
  *definitions* live in `CAST.arcs`. **Arcs ride the café's own clock:**
  progress accrues only in `updateNarrative` (dt-driven, one row per 24-minute
  café day while the café runs — hidden tabs included; a closed café holds
  still), and `reconcileNarrative` at boot only rebinds, clamps and re-applies —
  it never adds time. A ready beat never plays itself — it waits as an
  invitation until tapped. The audit guards all of this.

## Change playbooks

Each names the exact files so a session can start with two targeted reads
instead of seven. Every playbook ends the same way: the full checks pass
(`__dev.audit()` → 0 included) and the matching doc is updated in the same change.

### Add furniture

1. Coordinates into `SCENE.L` (`js/scene-core.js`) — never inline.
2. Draw it. Wall-mounted → the background layer in `js/scene-bg.js` (static
   cache for what never changes, per-frame wall pass for what does).
   Floor-standing → push a `{y, draw}` drawable with a correct baseline in
   `SCENE.furnitureDrawables` (`js/scene-furniture.js`).
3. Tall enough to fully hide a walker? Declare it in `L.occluders`. Floor pieces
   also need a footprint: additions to an existing `L` list get one derived
   automatically; a new *kind* needs its own `L.footprints` entry (mark
   torso-height tables `passable: true`; seats never are — see art.md).
4. Does it glow? Add a `glow()` call in `SCENE.drawLighting` (`js/scene-fx.js`)
   scaled by `pal.lamp` (candles scale with darkness).
5. Do characters use it? Add seats / walk targets in the sim reading from `L`
   (seating lives in `js/sim-patrons.js`); keep targets out of occluder spans
   and clear of the lane (`L.lane` ± 16). Items set on it need an anchor in
   `SCENE.tableItemAnchor`.
6. Verify: `?dev&overlay` screenshot for placement, the art.md furniture
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
   the shared saved-moment boundary (`js/sim-moments.js`), then register it:
   `SIM.addInvitation({ key, actors(world), start(world, actor) })`. Bubbles,
   the canvas tap and the accessible `#meet-<key>` button follow automatically.
   Visit gates and arrival lines: `SIM.gateRegular(id, { mayVisit, due, arrivalLine })`.
   Do not add the character's name to shared loops.
3. Verify with an in-page suite (every hello cursor across a reload, both
   answers, one-time completion) and, for the buttons, a UI flow in `tools/ui/`.

### Add patron behavior

1. Hook it in `js/sim-patrons.js`: a new state in the patron state machine,
   or — for at-the-table flavor — a timer in `updateSeated`. New personality
   traits go on the patron object at spawn in `js/sim-core.js`.
2. Caption it (optional, probability-gated so it stays sparse):
   `caption(world, text)` — rate limiting is inside; `withArticle()` for drink
   names; quiet, sentence-case voice.
3. Sound it (optional): an existing `SND` one-shot or a new one (see below),
   triggered from the state code, never from render.
4. If the body changes shape (sits, crouches, kneels), use a low pose so it
   eases; film it (`__dev.film`). Doc: characters.md, world.md for captions.

### Add or change an animation

1. Timing in the simulation (dt-driven state/timers); the renderer only reads
   state. Gestures use `SCENE._.keys`, and hands reach real anchors from `L`.
2. Body height or shape changes go through posture (`LOW_POSES`) or get their
   own in-between; props travel with hands. See the recipe in animations.md.
3. Film it and keep the `motion` suite at zero pops. Show the owner the strip.

### Add a sound / a caption

- **Sound:** synth function in `js/audio.js`, routed to the right bus (sfx /
  amb / fire / music; bell-like sounds take the delay send). Peak gain
  0.02–0.08 — if it sounds satisfying at demo volume it's too loud. Trigger
  from dt-driven sim code. Doc: a row in sounds.md's one-shot catalog.
- **Caption:** `caption(world, text)` at the trigger site, probability-gated
  (existing gates run 0.12–0.7; only once-per-visit milestones go ungated).
  Voice: warm, understated, quiet, sentence-case, Danish flavor welcome.
  Doc: the caption/event list in world.md.

## Conventions

- Vanilla ES5-ish JS in IIFEs exposing one global per file. `'use strict'`.
  No classes, no modules, no external libraries in the shipped game. Dev
  tooling may use pinned packages under `tools/`.
- Colors are hex literals chosen from the warm palette in
  [docs/art.md](docs/art.md); reuse existing swatches before inventing new ones.
- Randomness through the local `rnd(a, b)` / `pick(arr)` helpers.
- Captions are written in a warm, understated narrator voice — quiet,
  sentence-case, never jokey-loud. Danish flavor is welcome ("tak!").
- Character names may be Danish, international or unusually literary. The
  Copenhagen/Christianshavn inspiration includes a community with varied
  backgrounds; do not restrict the cast to Nordic names. Random patrons draw
  from `PATRON_NAMES` in `sim-core.js` (never two of the same name in the room
  at once); keep them distinct from named regulars.

## Docs index

For character dialogue and new story beats, read [docs/story-bible.md](docs/story-bible.md)
first. Preserve chosen Lunafreya background flags and distinguish shipped beats
from planned directions.

| Doc | Contents |
| --- | --- |
| [docs/overview.md](docs/overview.md) | Vision, design principles, what this is and isn't |
| [docs/progression-roadmap.md](docs/progression-roadmap.md) | Shipped milestones, the next brief, café/home stages, upgrades |
| [docs/development.md](docs/development.md) | Session workflow, tooling, every check and how CI deploys |
| [docs/audit.md](docs/audit.md) | Latest workflow/scalability/animation audit, what was fixed and what is open |
| [docs/narrative.md](docs/narrative.md) | The soft-narrative contract: invitation-waits rule, arcs, café-day progression, the save model, conversations |
| [docs/story-bible.md](docs/story-bible.md) | Cast identities and voices, remembered choices, shipped and planned story beats |
| [docs/plans/community-and-character-stories.md](docs/plans/community-and-character-stories.md) | Accepted ensemble direction, Lunafreya's history, shared arcs, gifts and romance |
| [docs/plans/first-books.md](docs/plans/first-books.md) | Next brief: Keira returns with the shelf, stocking, then attended book conversations |
| [docs/architecture.md](docs/architecture.md) | Modules, render pipeline, update loop, data shapes, contracts |
| [docs/characters.md](docs/characters.md) | Lunafreya, patrons, the cat — identities and behavior state machines |
| [docs/animations.md](docs/animations.md) | How characters move, the posture and gesture systems, motion checks and limits |
| [docs/world.md](docs/world.md) | Time, weather, lighting, spawning, captions/events |
| [docs/sounds.md](docs/sounds.md) | Every sound: how it's synthesized, when it triggers, gain levels |
| [docs/art.md](docs/art.md) | Pixel style guide, palette, layout map, lighting pass |
| [docs/art-workflow.md](docs/art-workflow.md) | Repeatable visual review and capture commands |
| [docs/ambience.md](docs/ambience.md) | Rules for captions that claim something about the room |
| [docs/roadmap.md](docs/roadmap.md) | Longer-term ideas, incl. the real-sample audio pipeline |
| [docs/plans/](docs/plans/) | Concrete execution plans. Executed plans are deleted; find them in git history |
| [docs/archive/](docs/archive/) | Retired material kept for reference only (not instructions) |

Keep these docs true: when you change behavior, sounds, layout, or characters,
update the matching doc in the same change. Rewrite a rule where it lives
rather than appending a dated note; history belongs in git.
